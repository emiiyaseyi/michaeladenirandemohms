import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, roleBasePath } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"
import { sendEmail } from "@/lib/email"
import { parseISO, format } from "date-fns"
import { eachDayOfInterval, isWeekend } from "date-fns"

async function calcDays(startDate: Date, endDate: Date, leaveTypeId: string) {
  const lt = await prisma.leaveType.findUnique({ where: { id: leaveTypeId }, select: { excludeWeekends: true } })
  const excludeWeekends = lt?.excludeWeekends ?? true
  const year = startDate.getFullYear()
  const publicHolidays = await prisma.publicHoliday.findMany({
    where: { year: { in: [year, year + 1] }, date: { gte: startDate, lte: endDate } },
    select: { date: true },
  })
  const holidayDates = new Set(publicHolidays.map(h => format(h.date, "yyyy-MM-dd")))
  return eachDayOfInterval({ start: startDate, end: endDate }).filter(day => {
    if (excludeWeekends && isWeekend(day)) return false
    if (holidayDates.has(format(day, "yyyy-MM-dd"))) return false
    return true
  }).length
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const { startDate, endDate, reason, handoverNotes } = body

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isAdmin = user.role === "SUPER_ADMIN" || !!user.permissions["canViewAllLeave"]
  const isOwner = request.employeeId === user.employeeId

  // Approver with a pending approval on this request may adjust dates
  const isPLEdit = !isAdmin && !isOwner && !!user.employeeId &&
    !!(await prisma.leaveApproval.findFirst({
      where: { leaveRequestId: id, stage: "PROJECT_LEAD", employeeId: user.employeeId, action: null },
    }))

  // Owner is NEVER allowed to edit their own pending request — only admins and pending PL approvers.
  if (!isAdmin && !isPLEdit) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Can only edit pending leave requests" }, { status: 400 })
  }

  const updates: any = {}
  // Field whitelist: PL editors can only touch dates. Admins can touch reason + handoverNotes too.
  if (isAdmin && !isPLEdit) {
    if (reason !== undefined) updates.reason = reason
    if (handoverNotes !== undefined) updates.handoverNotes = handoverNotes || null
  }

  if (startDate && endDate) {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    if (end < start) return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    const newDays = await calcDays(start, end, request.leaveTypeId)
    if (newDays < 1) {
      return NextResponse.json({ error: "Pick a valid range (at least 1 working day)." }, { status: 400 })
    }
    // Balance check: newDays must not exceed the employee's available balance for this leave type.
    // "Available" = allocated - (sum of OTHER pending/approved requests of this type, excluding this one).
    const [balanceRow, otherRequests, leaveType] = await Promise.all([
      prisma.leaveBalance.findFirst({
        where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: new Date().getFullYear() },
        select: { allocated: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          status: { in: ["PENDING", "APPROVED"] },
          NOT: { id },
        },
        select: { days: true },
      }),
      prisma.leaveType.findUnique({ where: { id: request.leaveTypeId }, select: { name: true, defaultDays: true } }),
    ])
    const allocated = balanceRow?.allocated ?? leaveType?.defaultDays ?? 0
    const otherDays = otherRequests.reduce((s, r) => s + r.days, 0)
    const available = Math.max(0, allocated - otherDays)
    if (newDays > available) {
      return NextResponse.json({ error: `This range exceeds the employee's remaining ${leaveType?.name ?? "leave"} balance (${available} day${available === 1 ? "" : "s"} available).` }, { status: 400 })
    }
    updates.startDate = start
    updates.endDate = end
    updates.days = newDays
  }

  const updated = await prisma.leaveRequest.update({ where: { id }, data: updates })

  // Audit the edit (always fetch owner userId, even when the editor IS the owner — shouldn't happen but cheap).
  const ownerForAudit = await prisma.employee.findUnique({
    where: { id: request.employeeId },
    select: { userId: true },
  })
  const editDiff = diffFields(request as any, updated as any, ["startDate", "endDate", "days", "reason", "handoverNotes"])
  if (editDiff) {
    await logAudit({
      req, actor: user, action: "LEAVE_EDIT", entity: "LeaveRequest", entityId: id,
      targetUserId: ownerForAudit?.userId ?? null,
      oldValues: editDiff.old, newValues: editDiff.new,
    })
  }

  // Notify the requester if someone OTHER than them edited their leave.
  if (!isOwner && Object.keys(updates).length > 0) {
    const ownerEmp = await prisma.employee.findUnique({
      where: { id: request.employeeId },
      select: { firstName: true, lastName: true, userId: true, user: { select: { role: true } } },
    })
    const editorEmp = user.employeeId
      ? await prisma.employee.findUnique({ where: { id: user.employeeId }, select: { firstName: true, lastName: true } })
      : null
    const editorName = editorEmp ? `${editorEmp.firstName} ${editorEmp.lastName}` : (user.name || "an admin")
    const leaveType = await prisma.leaveType.findUnique({ where: { id: request.leaveTypeId }, select: { name: true } })

    const changeLabels: string[] = []
    if (updates.startDate || updates.endDate) changeLabels.push("dates")
    if (updates.reason !== undefined) changeLabels.push("reason")
    if (updates.handoverNotes !== undefined) changeLabels.push("handover/relief")
    const changesSummary = changeLabels.join(", ")

    if (ownerEmp?.userId) {
      const base = roleBasePath((ownerEmp.user?.role as string) ?? "STAFF")
      await prisma.notification.create({
        data: {
          userId: ownerEmp.userId,
          employeeId: request.employeeId,
          title: "Your Leave Request Was Edited",
          message: `${editorName} updated your ${leaveType?.name ?? "leave"} request (${changesSummary}). Review the new details.`,
          type: "WARNING",
          link: `${base}/requests/leave`,
        },
      }).catch(() => {})
      sendEmail({
        eventKey: "leave_edited_by_other",
        toUserId: ownerEmp.userId,
        variables: {
          employeeName: `${ownerEmp.firstName} ${ownerEmp.lastName}`,
          editorName,
          changes: changesSummary,
          leaveType: leaveType?.name ?? "leave",
          startDate: format(updated.startDate, "MMM d, yyyy"),
          endDate: format(updated.endDate, "MMM d, yyyy"),
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ request: updated })
}
