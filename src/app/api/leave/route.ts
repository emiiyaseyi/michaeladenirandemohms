import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { requireAuth, forbidden, requirePermission } from "@/lib/api-auth"
import { eachDayOfInterval, isWeekend, format, parseISO, addHours, addDays } from "date-fns"

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

// Returns users who should receive HR-level leave notifications:
// SUPER_ADMIN + elevated users with canApproveLeave AND canViewAllLeave
async function getHRAdminRecipients(): Promise<{ userId: string; employeeId?: string }[]> {
  const [superAdmins, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true, employee: { select: { id: true } } },
    }),
    prisma.userAdminRole.findMany({
      include: {
        adminRole: { select: { permissions: true } },
        user: { select: { id: true, isActive: true, employee: { select: { id: true } } } },
      },
    }),
  ])

  const permsMap = new Map<string, Record<string, boolean>>()
  const infoMap = new Map<string, { id: string; employeeId?: string }>()
  for (const { user, adminRole } of assignments) {
    if (!user.isActive) continue
    const merged = permsMap.get(user.id) ?? {}
    const p = adminRole.permissions as Record<string, boolean>
    for (const [k, v] of Object.entries(p)) if (v) merged[k] = true
    permsMap.set(user.id, merged)
    infoMap.set(user.id, { id: user.id, employeeId: user.employee?.id })
  }

  const out = new Map<string, { userId: string; employeeId?: string }>()
  for (const u of superAdmins) out.set(u.id, { userId: u.id, employeeId: u.employee?.id })
  for (const [id, perms] of permsMap.entries()) {
    if (perms["canApproveLeave"] && perms["canViewAllLeave"]) {
      out.set(id, { userId: id, employeeId: infoMap.get(id)?.employeeId })
    }
  }
  return [...out.values()]
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const canViewAll = user.role === "SUPER_ADMIN" || !!user.permissions["canViewAllLeave"]
  const canApprove = !!user.permissions["canApproveLeave"]
  const isPL = user.role === "PROJECT_LEAD"
  const status = req.nextUrl.searchParams.get("status") ?? ""
  const filterEmployeeId = req.nextUrl.searchParams.get("employeeId") ?? ""

  let scopeFilter: any = {}
  if (canViewAll) {
    scopeFilter = {
      ...(status ? { status: status as any } : {}),
      ...(filterEmployeeId ? { employeeId: filterEmployeeId } : {}),
    }
  } else if (isPL && user.id) {
    // PROJECT_LEAD sees own requests + requests they are designated to approve
    const myApprovals = await prisma.leaveApproval.findMany({
      where: { employeeId: user.employeeId ?? "none", stage: "PROJECT_LEAD" },
      select: { leaveRequestId: true },
    })
    const approvalLeaveIds = myApprovals.map(a => a.leaveRequestId)
    scopeFilter = {
      ...(status ? { status: status as any } : {}),
      OR: [
        ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
        ...(approvalLeaveIds.length > 0 ? [{ id: { in: approvalLeaveIds } }] : []),
      ],
    }
  } else if (canApprove) {
    // Elevated STAFF with canApproveLeave: see requests where they have a LeaveApproval record
    const myApprovals = await prisma.leaveApproval.findMany({
      where: { employeeId: user.employeeId, stage: "PROJECT_LEAD" },
      select: { leaveRequestId: true },
    })
    const leaveIds = myApprovals.map(a => a.leaveRequestId)
    const ownFilter = user.employeeId ? [{ employeeId: user.employeeId }] : []
    scopeFilter = {
      ...(status ? { status: status as any } : {}),
      OR: [...ownFilter, ...(leaveIds.length > 0 ? [{ id: { in: leaveIds } }] : [])],
    }
  } else {
    scopeFilter = { employeeId: user.employeeId, ...(status ? { status: status as any } : {}) }
  }

  // Employees for relief officer picker (all active)
  // Project lead picker: only employees whose user has canApproveLeave permission
  const currentYear = new Date().getFullYear()
  const [requests, leaveTypes, employees, allAssignments] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: scopeFilter,
      include: {
        employee: { include: { department: true } },
        leaveType: { select: { id: true, name: true, defaultDays: true, requiresDoc: true, minDocDays: true, genderSpecific: true, waitingDays: true, excludeWeekends: true, rolloverPolicy: true, isActive: true, description: true } },
        approvals: { include: { employee: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "asc" } },
        reliefOfficersList: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { employeeStatus: "ACTIVE" },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true, gender: true, userId: true, projectLeadId: true, secondaryProjectLeadIds: true, user: { select: { role: true } } },
      distinct: ["userId"],
    }),
    prisma.userAdminRole.findMany({
      include: {
        adminRole: { select: { permissions: true } },
        user: { select: { id: true, isActive: true, role: true } },
      },
    }),
  ])

  // Build merged permissions per user to find who has canApproveLeave
  const canApproveUsers = new Set<string>()
  const permsMap = new Map<string, Record<string, boolean>>()
  for (const { user: u, adminRole } of allAssignments) {
    if (!u.isActive) continue
    if (u.role === "SUPER_ADMIN") { canApproveUsers.add(u.id); continue }
    const merged = permsMap.get(u.id) ?? {}
    const p = adminRole.permissions as Record<string, boolean>
    for (const [k, v] of Object.entries(p)) if (v) merged[k] = true
    permsMap.set(u.id, merged)
  }
  for (const [uid, perms] of permsMap.entries()) {
    if (perms["canApproveLeave"]) canApproveUsers.add(uid)
  }

  // PROJECT_LEAD role + secondary admins with canApproveLeave but NOT canViewAllLeave
  // (canViewAllLeave means HR-level final approver — excluded from PL picker)
  const projectLeadEmployees = employees.filter(e => {
    if (user.employeeId && e.id === user.employeeId) return false
    if (user.id && e.userId === user.id) return false
    const u = e.user as any
    if (!u) return false
    if (u.role === "PROJECT_LEAD") return true
    if (!e.userId) return false
    const perms = permsMap.get(e.userId)
    return !!(perms?.["canApproveLeave"] && !perms?.["canViewAllLeave"])
  })

  // Batch-fetch leave balances for all request employee+leaveType pairs
  const pairs = [...new Map(requests.map(r => [`${r.employeeId}:${r.leaveTypeId}`, { employeeId: r.employeeId, leaveTypeId: r.leaveTypeId }])).values()]
  const leaveBalances = pairs.length > 0
    ? await prisma.leaveBalance.findMany({ where: { year: currentYear, OR: pairs } })
    : []
  const balanceMap = new Map(leaveBalances.map(b => [`${b.employeeId}:${b.leaveTypeId}`, b]))

  const enriched = requests.map(r => {
    const b = balanceMap.get(`${r.employeeId}:${r.leaveTypeId}`)
    return {
      ...r,
      currentStage: computeStage(r),
      employeeLeaveBalance: b ? { allocated: b.allocated, used: b.used, pending: b.pending, remaining: Math.max(0, b.allocated - b.used - b.pending) } : null,
    }
  })
  return NextResponse.json({ requests: enriched, leaveTypes, employees, projectLeadEmployees })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { leaveTypeId, startDate, endDate, reason, projectLeads = [], documentUrl } = body
  let { employeeId } = body

  const canViewAll = user.role === "SUPER_ADMIN" || !!user.permissions["canViewAllLeave"]

  // Submitting for someone else requires canCreateLeave or SUPER_ADMIN
  if (employeeId && employeeId !== user.employeeId) {
    if (user.role !== "SUPER_ADMIN") {
      const perm = requirePermission(user, "canCreateLeave")
      if (perm) return perm
    }
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
    include: { department: true, manager: true },
  })
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  // Fetch leave type for policy checks
  const leaveType = await prisma.leaveType.findUnique({
    where: { id: leaveTypeId },
    select: { name: true, minNoticeDays: true, internOnly: true },
  })
  if (!leaveType) return NextResponse.json({ error: "Leave type not found" }, { status: 404 })

  // Intern-only check
  if (leaveType.internOnly) {
    const isIntern = (employee.jobTitle ?? "").toLowerCase().includes("intern")
    if (!isIntern) {
      return NextResponse.json({ error: `${leaveType.name} is only available to interns.` }, { status: 400 })
    }
  }

  // Working-days notice check
  const minNotice = leaveType.minNoticeDays ?? 10
  if (minNotice > 0) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const year = start.getFullYear()
    const holidays = await prisma.publicHoliday.findMany({
      where: { year: { in: [year, year - 1] } },
      select: { date: true },
    })
    const holidaySet = new Set(holidays.map(h => format(h.date, "yyyy-MM-dd")))
    const tomorrow = addDays(today, 1)
    // start >= tomorrow to have any notice at all
    const noticeDaysGiven = start < tomorrow ? 0 : eachDayOfInterval({ start: tomorrow, end: start })
      .filter(day => !isWeekend(day) && !holidaySet.has(format(day, "yyyy-MM-dd"))).length
    if (noticeDaysGiven < minNotice) {
      let d = new Date(today); let counted = 0
      while (counted < minNotice) { d = addDays(d, 1); if (!isWeekend(d) && !holidaySet.has(format(d, "yyyy-MM-dd"))) counted++ }
      return NextResponse.json({
        error: `${leaveType.name} requires at least ${minNotice} working days notice. Earliest start date: ${format(d, "MMM d, yyyy")}.`,
      }, { status: 400 })
    }
  }

  const freeze = await prisma.leaveFreezeperiod.findFirst({
    where: { startDate: { lte: end }, endDate: { gte: start } },
  })
  if (freeze) {
    return NextResponse.json({ error: `Leave is frozen during this period: "${freeze.name}"` }, { status: 400 })
  }

  const now = new Date()
  const plIds: string[] = (projectLeads as any[]).map((pl: any) => pl.employeeId).filter(Boolean)

  const effectivePLIds = [...new Set(
    plIds.length > 0
      ? plIds
      : [employee.projectLeadId, ...employee.secondaryProjectLeadIds].filter(Boolean) as string[]
  )]

  const approvalRecords: any[] = effectivePLIds.map(plId => ({
    employeeId: plId,
    stage: "PROJECT_LEAD" as const,
    deadline: addHours(now, 24),
  }))

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
      approvals: { create: approvalRecords },
    },
    include: { employee: true, leaveType: true },
  })

  // Notify all project leads
  for (const plId of effectivePLIds) {
    const plEmp = await prisma.employee.findUnique({
      where: { id: plId },
      select: { userId: true, user: { select: { role: true, adminRoles: { select: { adminRole: { select: { permissions: true } } } } } } },
    })
    if (plEmp?.userId) {
      // PL is elevated (has admin roles) → link to admin panel; PROJECT_LEAD role → /project-lead; otherwise /staff
      const plRole = plEmp.user?.role ?? "STAFF"
      const isElevatedPL = (plEmp.user?.adminRoles?.length ?? 0) > 0 || plRole === "SUPER_ADMIN"
      const plLink = isElevatedPL ? "/admin/requests/leave" : plRole === "PROJECT_LEAD" ? "/project-lead/requests/leave" : "/staff/requests/leave"
      await prisma.notification.create({
        data: {
          userId: plEmp.userId,
          employeeId: plId,
          title: "Leave Request — Your Approval Needed",
          message: `${employee.firstName} ${employee.lastName} submitted a ${request.days}-day ${request.leaveType.name} leave request (${format(start, "MMM d")} – ${format(end, "MMM d")}) and requires your approval.`,
          type: "WARNING",
          link: plLink,
        },
      })
      sendEmail({ eventKey: "leave_submitted_pl", toUserId: plEmp.userId, variables: { employeeName: `${employee.firstName} ${employee.lastName}`, leaveType: request.leaveType.name, startDate: format(start, "MMM d, yyyy"), endDate: format(end, "MMM d, yyyy"), days: String(request.days), reason: request.reason } }).catch(() => {})
    }
  }

  // Notify HR admins
  const hrAdmins = await getHRAdminRecipients()
  for (const hr of hrAdmins) {
    await prisma.notification.create({
      data: {
        userId: hr.userId,
        employeeId: hr.employeeId ?? null,
        title: "New Leave Request Submitted",
        message: `${employee.firstName} ${employee.lastName} submitted a ${request.days}-day leave request pending Project Lead approval.`,
        type: "INFO",
        link: `/admin/requests/leave`,
      },
    })
    sendEmail({ eventKey: "leave_submitted_hr", toUserId: hr.userId, variables: { employeeName: `${employee.firstName} ${employee.lastName}`, leaveType: request.leaveType.name, startDate: format(start, "MMM d, yyyy"), endDate: format(end, "MMM d, yyyy"), days: String(request.days) } }).catch(() => {})
  }

  return NextResponse.json({ request }, { status: 201 })
}
