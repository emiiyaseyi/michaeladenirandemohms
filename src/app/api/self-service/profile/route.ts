import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { differenceInMonths, differenceInYears, format } from "date-fns"

const REQUIRED_FIELDS = [
  "firstName", "lastName", "gender", "dateOfBirth", "maritalStatus",
  "personalEmail", "phone", "address", "city", "state",
  "profilePhoto", "nokName", "nokPhone",
]

function calcCompleteness(emp: any): number {
  const filled = REQUIRED_FIELDS.filter(f => emp[f] != null && emp[f] !== "").length
  return Math.round((filled / REQUIRED_FIELDS.length) * 100)
}

function timeInCompany(hireDate: Date | null): string {
  if (!hireDate) return "—"
  const now = new Date()
  const years = differenceInYears(now, hireDate)
  const months = differenceInMonths(now, hireDate) % 12
  if (years === 0) return months <= 1 ? "Less than a month" : `${months} month${months !== 1 ? "s" : ""}`
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`
  return `${years} year${years !== 1 ? "s" : ""} ${months} month${months !== 1 ? "s" : ""}`
}

function workAnniversary(hireDate: Date | null): string {
  if (!hireDate) return "—"
  return format(hireDate, "MMM do")
}

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ error: "No employee profile linked" }, { status: 404 })

  const currentYear = new Date().getFullYear()

  // Step 1: get employee with dept info (single query)
  const employee = await prisma.employee.findUnique({
    where: { id: user.employeeId },
    include: {
      department: true,
      projectLead: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      manager: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      projectAssignments: {
        where: { project: { status: "ACTIVE" } },
        include: { project: { select: { id: true, name: true, status: true } } },
      },
      leaveBalances: {
        where: { year: currentYear },
        include: { leaveType: true },
      },
    },
  })

  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const departmentId = employee.departmentId

  const inviteCount = await prisma.employeeInvite.count({ where: { employeeId: employee.id } })
  const cameViaInvite = inviteCount > 0

  // Step 2: parallel fetch of everything else (no nested async in Promise.all)
  const [leaveTypes, leaveRequests, teamOnLeave, deptMembers] = await Promise.all([
    prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),

    prisma.leaveRequest.findMany({
      where: { employeeId: user.employeeId, status: { in: ["PENDING", "APPROVED"] } },
      include: { leaveType: true },
      orderBy: { startDate: "asc" },
    }),

    departmentId
      ? prisma.employee.findMany({
          where: {
            id: { not: user.employeeId },
            departmentId,
            leaveRequests: { some: { status: "APPROVED", endDate: { gte: new Date() } } },
          },
          select: {
            id: true, firstName: true, lastName: true, jobTitle: true,
            profilePhoto: true, employeeStatus: true,
            leaveRequests: {
              where: { status: "APPROVED", endDate: { gte: new Date() } },
              include: { leaveType: true },
              orderBy: { startDate: "asc" },
              take: 1,
            },
          },
        })
      : Promise.resolve([]),

    departmentId
      ? prisma.employee.findMany({
          where: { id: { not: user.employeeId }, departmentId },
          select: { id: true, firstName: true, lastName: true, dateOfBirth: true, hireDate: true, profilePhoto: true, jobTitle: true, employeeStatus: true },
          take: 50,
        })
      : Promise.resolve([]),
  ])

  // Build leave balance summary
  // Types with deductFromAnnual=true are hidden from the summary — their usage
  // is rolled into Annual Leave's balance instead (see Annual Leave row below).
  const annualLeaveTypeId = leaveTypes.find(lt => lt.name === "Annual Leave")?.id ?? null

  const leaveBalanceSummary = leaveTypes
    .filter(lt => !lt.deductFromAnnual)
    .map(lt => {
    const balance = employee.leaveBalances.find(b => b.leaveTypeId === lt.id)
    // Find all leave types that deduct from this one (so we count their usage too)
    const deductingTypeIds = lt.id === annualLeaveTypeId
      ? leaveTypes.filter(t => t.deductFromAnnual).map(t => t.id)
      : []
    const idsToCount = [lt.id, ...deductingTypeIds]

    if (balance) {
      // Add usage from deducting types (e.g. Study Leave eating into Annual Leave)
      const extraUsed = leaveRequests.filter(r => deductingTypeIds.includes(r.leaveTypeId) && r.status === "APPROVED" && new Date(r.endDate) < new Date()).reduce((s, r) => s + r.days, 0)
      const extraPending = leaveRequests.filter(r => deductingTypeIds.includes(r.leaveTypeId) && r.status === "PENDING").reduce((s, r) => s + r.days, 0)
      return {
        leaveTypeId: lt.id,
        name: lt.name,
        genderSpecific: lt.genderSpecific,
        allocated: balance.allocated,
        used: balance.used + extraUsed,
        pending: balance.pending + extraPending,
        remaining: Math.max(0, balance.allocated - balance.used - balance.pending - extraUsed - extraPending),
      }
    }
    const allocated = lt.defaultDays
    const usedDays = leaveRequests.filter(r => idsToCount.includes(r.leaveTypeId) && r.status === "APPROVED" && new Date(r.endDate) < new Date()).reduce((s, r) => s + r.days, 0)
    const pendingDays = leaveRequests.filter(r => idsToCount.includes(r.leaveTypeId) && r.status === "PENDING").reduce((s, r) => s + r.days, 0)
    return {
      leaveTypeId: lt.id,
      name: lt.name,
      genderSpecific: lt.genderSpecific,
      allocated,
      used: usedDays,
      pending: pendingDays,
      remaining: Math.max(0, allocated - usedDays - pendingDays),
    }
  })

  // Filter balances by employee gender
  const filteredBalances = leaveBalanceSummary.filter(lb => {
    if (!lb.genderSpecific) return true
    if (!employee.gender) return true
    return lb.genderSpecific === employee.gender
  })

  // Upcoming celebrations (60 days)
  const today = new Date()
  const in60 = new Date(today); in60.setDate(today.getDate() + 60)
  const allEvents = (deptMembers as any[]).flatMap(m => {
    const events: any[] = []
    if (m.employeeStatus === "ON_LEAVE") {
      events.push({ type: "onLeave", employeeId: m.id, name: `${m.firstName} ${m.lastName}`, jobTitle: m.jobTitle, profilePhoto: m.profilePhoto })
    }
    if (m.dateOfBirth) {
      const bday = new Date(m.dateOfBirth)
      const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
      if (thisYear >= today && thisYear <= in60) {
        events.push({ type: "birthday", employeeId: m.id, name: `${m.firstName} ${m.lastName}`, date: thisYear.toISOString(), jobTitle: m.jobTitle, profilePhoto: m.profilePhoto })
      }
    }
    if (m.hireDate) {
      const hire = new Date(m.hireDate)
      const thisYearAnn = new Date(today.getFullYear(), hire.getMonth(), hire.getDate())
      const years = differenceInYears(thisYearAnn, hire)
      if (thisYearAnn >= today && thisYearAnn <= in60 && years > 0) {
        events.push({ type: "anniversary", employeeId: m.id, name: `${m.firstName} ${m.lastName}`, date: thisYearAnn.toISOString(), years, jobTitle: m.jobTitle, profilePhoto: m.profilePhoto })
      }
    }
    return events
  })
  const dated = allEvents.filter(e => e.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const undated = allEvents.filter(e => !e.date)
  const upcomingEvents = [...dated, ...undated]

  return NextResponse.json({
    profile: {
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: `${employee.firstName} ${employee.lastName}`,
      jobTitle: employee.jobTitle,
      department: employee.department?.name ?? null,
      projectLead: employee.projectLead
        ? { id: employee.projectLead.id, name: `${employee.projectLead.firstName} ${employee.projectLead.lastName}`, jobTitle: employee.projectLead.jobTitle }
        : null,
      supervisor: employee.manager
        ? { id: employee.manager.id, name: `${employee.manager.firstName} ${employee.manager.lastName}`, jobTitle: employee.manager.jobTitle }
        : null,
      role: user.role,
      profilePhoto: employee.profilePhoto,
      hireDate: employee.hireDate,
      workAnniversary: workAnniversary(employee.hireDate),
      timeInCompany: timeInCompany(employee.hireDate),
      completeness: calcCompleteness(employee),
      cameViaInvite,
      activeProjects: employee.projectAssignments.map(a => ({ id: a.project.id, name: a.project.name, role: a.role })),
      employeeStatus: employee.employeeStatus,
      gender: employee.gender,
      // Contact & personal
      email: user.email ?? employee.personalEmail,
      phone: employee.phone,
      city: employee.city,
      state: employee.state,
      maritalStatus: employee.maritalStatus,
      nin: employee.nin,
      aiMembership: employee.aiMembership,
    },
    leaveBalances: filteredBalances,
    teamOnLeave: (teamOnLeave as any[]).map(m => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      jobTitle: m.jobTitle,
      profilePhoto: m.profilePhoto,
      status: m.employeeStatus,
      currentLeave: m.leaveRequests[0] ? {
        leaveType: m.leaveRequests[0].leaveType.name,
        startDate: m.leaveRequests[0].startDate,
        endDate: m.leaveRequests[0].endDate,
        days: m.leaveRequests[0].days,
      } : null,
    })),
    upcomingEvents,
  })
}
