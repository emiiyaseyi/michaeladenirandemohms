import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, roleBasePath } from "@/lib/api-auth"
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

  if (!isOwner && !isAdmin && !isPLEdit) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Can only edit pending leave requests" }, { status: 400 })
  }

  const updates: any = {}
  if (reason !== undefined) updates.reason = reason
  if (handoverNotes !== undefined) updates.handoverNotes = handoverNotes || null

  if (startDate && endDate) {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    if (end < start) return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    updates.startDate = start
    updates.endDate = end
    updates.days = Math.max(1, await calcDays(start, end, request.leaveTypeId))
  }

  const updated = await prisma.leaveRequest.update({ where: { id }, data: updates })

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
