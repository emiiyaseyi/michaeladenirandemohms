import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { subMonths, startOfMonth, format } from "date-fns"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewAnalytics && !caps(user.role).canViewTeamAnalytics) {
    return forbidden("No access to analytics")
  }
  const [total, active, onLeave, openJobs, byDept, byType, allLeave, recruitment] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { employeeStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { employeeStatus: "ON_LEAVE" } }),
    prisma.jobPosting.count({ where: { status: "OPEN" } }),
    prisma.department.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } }),
    prisma.employee.groupBy({ by: ["employmentType"], _count: true }),
    prisma.leaveRequest.findMany({ where: { createdAt: { gte: subMonths(new Date(), 6) } }, select: { createdAt: true, status: true } }),
    prisma.jobApplication.groupBy({ by: ["stage"], _count: true }),
  ])

  const byDepartment = byDept.map(d => ({ name: d.name.length > 12 ? d.name.slice(0,12)+"…" : d.name, count: d._count.employees }))
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
