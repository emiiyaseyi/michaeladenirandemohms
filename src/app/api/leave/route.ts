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

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)
  const status = req.nextUrl.searchParams.get("status") ?? ""

  let scopeFilter: any = {}
  if (c.canViewAllLeave) {
    scopeFilter = status ? { status: status as any } : {}
  } else if (c.canViewTeamLeave) {
    if (user.role === "TEAM_LEAD") {
      const reports = await prisma.employee.findMany({ where: { managerId: user.employeeId }, select: { id: true } })
      const ids = reports.map(r => r.id)
      scopeFilter = { employeeId: { in: ids }, ...(status ? { status: status as any } : {}) }
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
      select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true, gender: true, userId: true },
      distinct: ["userId"],
    }),
  ])

  return NextResponse.json({ requests, leaveTypes, employees })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canSubmitLeave) return forbidden()

  const body = await req.json()
  const { leaveTypeId, startDate, endDate, reason, handoverNotes, reliefOfficerIds = [], teamLeadIds = [], documentUrl } = body
  let { employeeId } = body

  const c = caps(user.role)
  if (!c.canViewAllLeave && employeeId && employeeId !== user.employeeId) {
    return forbidden("You can only submit leave for yourself")
  }
  if (!employeeId) employeeId = user.employeeId

  if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
    return NextResponse.json({ error: "All required fields must be provided" }, { status: 400 })
  }

  const start = parseISO(startDate)
  const end = parseISO(endDate)
  if (end < start) return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })

  const days = Math.max(1, await calcDays(start, end, leaveTypeId))

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, manager: true, departmentLead: true },
  })
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const freeze = await prisma.leaveFreezeperiod.findFirst({
    where: { startDate: { lte: end }, endDate: { gte: start } },
  })
  if (freeze) {
    return NextResponse.json({ error: `Leave is frozen during this period: "${freeze.name}"` }, { status: 400 })
  }

  // Build approval records: Relief Officer(s) → Team Lead → Admin
  // Relief officers are tracked via reliefOfficersList (not in approvals table)
  const approvalRecords: any[] = []
  const now = new Date()

  const tlDeadlineHours = reliefOfficerIds.length > 0 ? 36 : 24

  // Team lead (one record — dept lead or team head)
  const tlId = (teamLeadIds as string[])[0] || employee.departmentLeadId || null
  if (tlId) {
    approvalRecords.push({
      employeeId: tlId,
      stage: "TEAM_LEAD" as const,
      deadline: addHours(now, tlDeadlineHours),
    })
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId,
      startDate: start,
      endDate: end,
      days,
      reason,
      handoverNotes: handoverNotes || null,
      documentUrl: documentUrl || null,
      departmentId: employee.departmentId,
      status: "PENDING",
      teamLeadIds: teamLeadIds.length > 0 ? JSON.stringify(teamLeadIds) : null,
      reliefOfficersList: reliefOfficerIds.length > 0 ? {
        create: reliefOfficerIds.map((rid: string) => ({ employeeId: rid, status: "PENDING" })),
      } : undefined,
      approvals: {
        create: approvalRecords,
      },
    },
    include: { employee: true, leaveType: true },
  })

  // Notify all relief officers
  for (const rid of reliefOfficerIds) {
    const reliefEmp = await prisma.employee.findUnique({
      where: { id: rid },
      select: { userId: true, user: { select: { role: true } } },
    })
    if (reliefEmp) {
      const rRole = reliefEmp.user?.role ?? "STAFF"
      const rBase = rRole === "ADMIN" || rRole === "SUPER_ADMIN" ? "/admin" : rRole === "TEAM_LEAD" ? "/team-lead" : "/staff"
      await prisma.notification.create({
        data: {
          userId: reliefEmp.userId,
          employeeId: rid,
          title: "Relief Officer Request",
          message: `${employee.firstName} ${employee.lastName} has selected you as a relief officer for their ${request.days}-day leave (${format(start, "MMM d")} – ${format(end, "MMM d")}). Please accept or decline within 12 hours.`,
          type: "INFO",
          link: `${rBase}/requests/leave?tab=relief`,
        },
      })
    }
  }

  // Notify team lead immediately only if there are no relief officers (otherwise notified after all accept)
  if (reliefOfficerIds.length === 0 && tlId) {
    const tlEmp = await prisma.employee.findUnique({
      where: { id: tlId },
      select: { userId: true, user: { select: { role: true } } },
    })
    if (tlEmp) {
      const tlRole = tlEmp.user?.role ?? "TEAM_LEAD"
      const tlBase = tlRole === "ADMIN" || tlRole === "SUPER_ADMIN" ? "/admin" : tlRole === "TEAM_LEAD" ? "/team-lead" : "/staff"
      await prisma.notification.create({
        data: {
          userId: tlEmp.userId,
          employeeId: tlId,
          title: "Leave Request Pending Approval",
          message: `${employee.firstName} ${employee.lastName} submitted a ${request.days}-day leave request awaiting your approval.`,
          type: "WARNING",
          link: `${tlBase}/requests/leave`,
        },
      })
    }
  }

  return NextResponse.json({ request }, { status: 201 })
}
