import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { eachDayOfInterval, isWeekend, format, parseISO, addHours } from "date-fns"

async function calcDays(startDate: Date, endDate: Date, leaveTypeId: string) {
  const lt = await prisma.leaveType.findUnique({ where: { id: leaveTypeId }, select: { excludeWeekends: true } })
  const excludeWeekends = lt?.excludeWeekends ?? true
  const year = startDate.getFullYear()
  const publicHolidays = await prisma.publicHoliday.findMany({
    where: { year: { in: [year, year + 1] }, date: { gte: startDate, lte: endDate } },
    select: { date: true },
  })
  const holidayDates = new Set(publicHolidays.map(h => format(h.date, "yyyy-MM-dd")))
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })
  return allDays.filter(day => {
    if (excludeWeekends && isWeekend(day)) return false
    if (holidayDates.has(format(day, "yyyy-MM-dd"))) return false
    return true
  }).length
}

function computeStage(req: any): string {
  if (req.status === "APPROVED") return "APPROVED"
  if (req.status === "REJECTED") return "REJECTED"
  if (req.status === "CANCELLED" || req.status === "CANCELLED_BY_ADMIN") return req.status
  const plApprovals = (req.approvals ?? []).filter((a: any) => a.stage === "PROJECT_LEAD")
  if (plApprovals.length > 0) {
    if (plApprovals.some((a: any) => a.action === "REJECTED")) return "REJECTED"
    if (plApprovals.some((a: any) => !a.action)) return "PENDING_PROJECT_LEAD"
  }
  const hrApproval = (req.approvals ?? []).find((a: any) => a.stage === "HR_ADMIN")
  if (!hrApproval?.action) return "PENDING_HR_ADMIN"
  return "APPROVED"
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)
  const status = req.nextUrl.searchParams.get("status") ?? ""

  let scopeFilter: any = {}
  if (c.canViewAllLeave) {
    scopeFilter = status ? { status: status as any } : {}
  } else if (c.canViewTeamLeave) {
    if (user.role === "PROJECT_LEAD") {
      // Show requests where this PL has an approval record assigned to them
      const myApprovals = await prisma.leaveApproval.findMany({
        where: { employeeId: user.employeeId, stage: "PROJECT_LEAD" },
        select: { leaveRequestId: true },
      })
      const leaveIds = myApprovals.map(a => a.leaveRequestId)
      scopeFilter = { id: { in: leaveIds }, ...(status ? { status: status as any } : {}) }
    }
  } else {
    scopeFilter = { employeeId: user.employeeId, ...(status ? { status: status as any } : {}) }
  }

  const [requests, leaveTypes, employees] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: scopeFilter,
      include: {
        employee: { include: { department: true } },
        leaveType: true,
        approvals: { include: { employee: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "asc" } },
        reliefOfficersList: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    // Return active employees for relief officer picker — deduplicate by userId
    prisma.employee.findMany({
      where: { employeeStatus: "ACTIVE" },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true, gender: true, userId: true, projectLeadId: true, secondaryProjectLeadIds: true },
      distinct: ["userId"],
    }),
  ])

  const enriched = requests.map(r => ({ ...r, currentStage: computeStage(r) }))
  return NextResponse.json({ requests: enriched, leaveTypes, employees })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canSubmitLeave) return forbidden()

  const body = await req.json()
  // projectLeads: [{ employeeId, taskName, taskDescription?, relieverId? }]
  const { leaveTypeId, startDate, endDate, reason, projectLeads = [], documentUrl } = body
  let { employeeId } = body

  const c = caps(user.role)
  if (!c.canViewAllLeave && employeeId && employeeId !== user.employeeId) {
    return forbidden("You can only submit leave for yourself")
  }
  if (!employeeId) employeeId = user.employeeId

  // HR Admin (SUPER_ADMIN) cannot apply for leave for themselves
  if (user.role === "SUPER_ADMIN" && employeeId === user.employeeId) {
    return forbidden("HR Admin cannot apply for leave")
  }

  if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
    return NextResponse.json({ error: "All required fields must be provided" }, { status: 400 })
  }

  const start = parseISO(startDate)
  const end = parseISO(endDate)
  if (end < start) return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })

  const days = Math.max(1, await calcDays(start, end, leaveTypeId))

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, manager: true },
  })
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const freeze = await prisma.leaveFreezeperiod.findFirst({
    where: { startDate: { lte: end }, endDate: { gte: start } },
  })
  if (freeze) {
    return NextResponse.json({ error: `Leave is frozen during this period: "${freeze.name}"` }, { status: 400 })
  }

  const now = new Date()
  const plIds: string[] = (projectLeads as any[]).map((pl: any) => pl.employeeId).filter(Boolean)

  // Auto-fill from employee's saved project leads if none supplied; deduplicate
  const effectivePLIds = [...new Set(
    plIds.length > 0
      ? plIds
      : [employee.projectLeadId, ...employee.secondaryProjectLeadIds].filter(Boolean) as string[]
  )]

  // Build one approval record per project lead
  const approvalRecords: any[] = effectivePLIds.map(plId => ({
    employeeId: plId,
    stage: "PROJECT_LEAD" as const,
    deadline: addHours(now, 24),
  }))

  // Store relief suggestions (handover) as JSON in handoverNotes
  const handoverData = (projectLeads as any[]).map((pl: any) => ({
    projectLeadId: pl.employeeId,
    taskName: pl.taskName,
    taskDescription: pl.taskDescription ?? null,
    relieverId: pl.relieverId ?? null,
  }))

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId,
      startDate: start,
      endDate: end,
      days,
      reason,
      handoverNotes: handoverData.length > 0 ? JSON.stringify(handoverData) : null,
      documentUrl: documentUrl || null,
      departmentId: employee.departmentId,
      status: "PENDING",
      projectLeadIds: effectivePLIds.length > 0 ? JSON.stringify(effectivePLIds) : null,
      // Relief officers are NOT created on submission — they are created and notified
      // only after all Project Leads have approved (see approve/route.ts)
      approvals: { create: approvalRecords },
    },
    include: { employee: true, leaveType: true },
  })

  // Notify all project leads
  for (const plId of effectivePLIds) {
    const plEmp = await prisma.employee.findUnique({
      where: { id: plId },
      select: { userId: true, user: { select: { role: true } } },
    })
    if (plEmp) {
      const plRole = (plEmp.user?.role as string) ?? "PROJECT_LEAD"
      await prisma.notification.create({
        data: {
          userId: plEmp.userId,
          employeeId: plId,
          title: "Leave Request — Your Approval Needed",
          message: `${employee.firstName} ${employee.lastName} submitted a ${request.days}-day ${request.leaveType.name} leave request (${format(start, "MMM d")} – ${format(end, "MMM d")}) and requires your approval.`,
          type: "WARNING",
          link: `${plRole === "ADMIN" || plRole === "SUPER_ADMIN" ? "/admin" : plRole === "PROJECT_LEAD" ? "/project-lead" : "/staff"}/requests/leave`,
        },
      })
    }
  }

  // Notify all admins
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
    select: { id: true, employee: { select: { id: true } } },
  })
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        employeeId: admin.employee?.id ?? null,
        title: "New Leave Request Submitted",
        message: `${employee.firstName} ${employee.lastName} submitted a ${request.days}-day leave request pending Project Lead approval.`,
        type: "INFO",
        link: `/admin/requests/leave`,
      },
    })
  }

  return NextResponse.json({ request }, { status: 201 })
}
