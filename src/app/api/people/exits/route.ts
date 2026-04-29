import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)
  if (!c.canViewTeamEmployees && !c.canViewAllEmployees) return forbidden()

  const scopeFilter = (!c.canViewAllEmployees && c.canViewTeamEmployees && user.employeeId)
    ? { managerId: user.employeeId }
    : {}

  const employees = await prisma.employee.findMany({
    where: {
      ...scopeFilter,
      employeeStatus: { in: ["RESIGNED", "TERMINATED"] },
    },
    select: {
      id: true, firstName: true, lastName: true, employeeId: true,
      jobTitle: true, profilePhoto: true, employeeStatus: true,
      department: { select: { name: true } },
      offboarding: { select: { exitType: true, lastWorkingDay: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ employees })
}
