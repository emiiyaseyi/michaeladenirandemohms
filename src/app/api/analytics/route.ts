import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { subMonths, startOfMonth, format } from "date-fns"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  const c = caps(user.role)
  // R6: also accept users who have canViewAnalytics granted via an admin role bundle
  // (e.g. secondary-admin) — previously only role-based caps were honoured, which
  // wrongly blocked elevated STAFF from analytics.
  const hasAnalyticsGrant = user.permissions?.canViewAnalytics === true
  if (!c.canViewAnalytics && !c.canViewTeamAnalytics && !hasAnalyticsGrant) {
    return forbidden("No access to analytics")
  }

  // Project leads only see their own team's data
  const isTeamScoped = !c.canViewAnalytics && c.canViewTeamAnalytics
  let teamIds: string[] | null = null
  if (isTeamScoped) {
    const reports = await prisma.employee.findMany({ where: { managerId: user.employeeId }, select: { id: true } })
    teamIds = reports.map(r => r.id)
  }
  const superAdminExclusion = { NOT: { user: { role: "SUPER_ADMIN" as any } } }
  const empFilter: any = teamIds
    ? { AND: [{ id: { in: teamIds } }, superAdminExclusion] }
    : superAdminExclusion

  const [total, active, onLeave, openJobs, byDept, byType, allLeave, recruitment] = await Promise.all([
    prisma.employee.count({ where: empFilter }),
    prisma.employee.count({ where: { ...empFilter, employeeStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { ...empFilter, employeeStatus: "ON_LEAVE" } }),
    isTeamScoped ? Promise.resolve(0) : prisma.jobPosting.count({ where: { status: "OPEN" } }),
    isTeamScoped
      ? prisma.employee.groupBy({ by: ["departmentId"], where: empFilter, _count: true }).then(rows =>
          rows.map(r => ({ name: r.departmentId ?? "—", count: r._count }))
        )
      : prisma.department.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } }),
    prisma.employee.groupBy({ by: ["employmentType"], where: empFilter, _count: true }),
    prisma.leaveRequest.findMany({
      where: { createdAt: { gte: subMonths(new Date(), 6) }, ...(teamIds ? { employeeId: { in: teamIds } } : {}) },
      select: { createdAt: true, status: true },
    }),
    isTeamScoped ? Promise.resolve([]) : prisma.jobApplication.groupBy({ by: ["stage"], _count: true }),
  ])

  const byDepartment = isTeamScoped
    ? (byDept as any[]).map(d => ({ name: d.name ?? "—", count: d.count }))
    : (byDept as any[]).map(d => ({ name: d.name.length > 12 ? d.name.slice(0,12)+"…" : d.name, count: d._count.employees }))
  const byTypeFormatted = byType.map(t => ({ type: t.employmentType.replace(/_/g," "), count: t._count }))

  // Build 6-month leave trend
  const leaveTrend = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i)
    const monthStr = format(month, "MMM")
    const monthStart = startOfMonth(month)
    const monthRequests = allLeave.filter(l => new Date(l.createdAt) >= monthStart && new Date(l.createdAt) < startOfMonth(subMonths(month, -1)))
    return { month: monthStr, requests: monthRequests.length, approved: monthRequests.filter(l => l.status === "APPROVED").length }
  })

  const recruitmentFunnel = recruitment.map(r => ({ stage: r.stage.replace(/_/g," "), count: r._count }))

  return NextResponse.json({
    headcount: { total, active, onLeave },
    leaveRate: total > 0 ? Math.round((onLeave/total)*100) : 0,
    openJobs,
    byDepartment,
    byType: byTypeFormatted,
    leaveTrend,
    recruitmentFunnel,
  })
}
