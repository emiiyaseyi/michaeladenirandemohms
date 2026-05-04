import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)

  // Scoped dashboard stats for limited roles
  if (c.canViewAllEmployees) {
    const [totalEmp, active, onLeave, pending, openJobs] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { employeeStatus: "ACTIVE" } }),
      prisma.employee.count({ where: { employeeStatus: "ON_LEAVE" } }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.jobPosting.count({ where: { status: "OPEN" } }),
    ])
    return NextResponse.json({ totalEmp, active, onLeave, pending, openJobs })
  }

  // MANAGER / DEPT_LEAD — scoped to their team
  if (c.canViewTeamEmployees && user.employeeId) {
    let teamFilter: any = {}
    if (user.role === "PROJECT_LEAD") {
      teamFilter = { managerId: user.employeeId }
    }
    const [totalEmp, active, onLeave, pending] = await Promise.all([
      prisma.employee.count({ where: teamFilter }),
      prisma.employee.count({ where: { ...teamFilter, employeeStatus: "ACTIVE" } }),
      prisma.employee.count({ where: { ...teamFilter, employeeStatus: "ON_LEAVE" } }),
      prisma.leaveRequest.count({ where: { employee: teamFilter, status: "PENDING" } }),
    ])
    return NextResponse.json({ totalEmp, active, onLeave, pending, openJobs: 0 })
  }

  // STAFF / INTERN — personal stats only
  const myLeave = user.employeeId
    ? await prisma.leaveRequest.count({ where: { employeeId: user.employeeId, status: "PENDING" } })
    : 0
  return NextResponse.json({ totalEmp: 1, active: 1, onLeave: 0, pending: myLeave, openJobs: 0 })
}
