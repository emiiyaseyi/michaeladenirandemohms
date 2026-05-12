import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewAllEmployees) return forbidden()

  const employees = await prisma.employee.findMany({
    where: {
      employeeStatus: "ACTIVE",
      confirmationDate: null,
    },
    select: {
      id: true, firstName: true, lastName: true, user: { select: { email: true } }, phone: true,
      profilePhoto: true, hireDate: true, probationEndDate: true,
      onProbation: true, employeeStatus: true, jobTitle: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: { hireDate: "asc" },
  })

  return NextResponse.json({ employees })
}
