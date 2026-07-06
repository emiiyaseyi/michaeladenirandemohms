import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })
  if (!employee) return NextResponse.json({ projects: [] })

  const memberships = await prisma.projectMember.findMany({
    where: { employeeId: employee.id, project: { deletedAt: null } },
    include: {
      project: {
        include: {
          department: { select: { id: true, name: true } },
          lead: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  })

  return NextResponse.json({ memberships })
}
