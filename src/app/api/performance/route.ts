import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)
  if (!c.canViewAllPerformance && !c.canViewTeamPerformance && !c.canSubmitOwnKPI) {
    return forbidden("No access to performance data")
  }

  // Scope KPI filter
  let kpiFilter: any = {}
  if (c.canViewAllPerformance) {
    kpiFilter = {}
  } else if (c.canViewTeamPerformance) {
    if (user.role === "TEAM_LEAD") {
      const reports = await prisma.employee.findMany({ where: { managerId: user.employeeId }, select: { id: true } })
      kpiFilter = { employeeId: { in: [user.employeeId ?? "", ...reports.map(r => r.id)] } }
    } else {
      kpiFilter = { employeeId: user.employeeId }
    }
  } else {
    kpiFilter = { employeeId: user.employeeId }
  }

  const [kpis, cycles, employees] = await Promise.all([
    prisma.kPI.findMany({ where: kpiFilter, include: { employee: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.performanceCycle.findMany({ orderBy: { createdAt: "desc" } }),
    c.canViewAllPerformance
      ? prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } })
      : prisma.employee.findMany({ where: { id: user.employeeId ?? "" }, select: { id: true, firstName: true, lastName: true } }),
  ])
  return NextResponse.json({ kpis, cycles, employees })
}
