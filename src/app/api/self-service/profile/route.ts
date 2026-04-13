import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { differenceInMonths, differenceInYears, format } from "date-fns"

const REQUIRED_FIELDS = [
  "firstName", "lastName", "gender", "dateOfBirth", "maritalStatus",
  "personalEmail", "phone", "address", "city", "state",
  "profilePhoto", "nokName", "nokPhone", "bankName", "bankAccountNo",
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
      departmentLead: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
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
          select: { id: true, firstName: true, lastName: true, dateOfBirth: true, hireDate: true, profilePhoto: true, jobTitle: true },
          take: 50,
        })
      : Promise.resolve([]),
  ])

  // Build leave balance summary
  const leaveBalanceSummary = leaveTypes.map(lt => {
    const balance = employee.leaveBalances.find(b => b.leaveTypeId === lt.id)
    if (balance) {
      return {
        leaveTypeId: lt.id,
        name: lt.name,
        genderSpecific: lt.genderSpecific,
        allocated: balance.allocated,
        used: balance.used,
        pending: balance.pending,
        remaining: Math.max(0, balance.allocated - balance.used - balance.pending),
      }
    }
    let allocated = lt.defaultDays
    if (lt.name.toLowerCase().includes("annual")) allocated = employee.annualLeaveBalance
    else if (lt.name.toLowerCase().includes("sick")) allocated = employee.sickLeaveBalance
    const usedDays = leaveRequests.filter(r => r.leaveTypeId === lt.id && r.status === "APPROVED" && new Date(r.endDate) < new Date()).reduce((s, r) => s + r.days, 0)
    const pendingDays = leaveRequests.filter(r => r.leaveTypeId === lt.id && r.status === "PENDING").reduce((s, r) => s + r.days, 0)
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
  const upcomingEvents = (deptMembers as any[]).flatMap(m => {
    const events: any[] = []
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
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return NextResponse.json({
    profile: {
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: `${employee.firstName} ${employee.lastName}`,
      jobTitle: employee.jobTitle,
      department: employee.department?.name ?? null,
      departmentLead: employee.departmentLead
        ? { id: employee.departmentLead.id, name: `${employee.departmentLead.firstName} ${employee.departmentLead.lastName}`, jobTitle: employee.departmentLead.jobTitle }
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
      activeProjects: employee.projectAssignments.map(a => ({ id: a.project.id, name: a.project.name, role: a.role })),
      employeeStatus: employee.employeeStatus,
      gender: employee.gender,
      // Contact & personal
      email: employee.workEmail ?? employee.personalEmail,
      phone: employee.phone,
      city: employee.city,
      state: employee.state,
      maritalStatus: employee.maritalStatus,
      bankName: employee.bankName,
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
