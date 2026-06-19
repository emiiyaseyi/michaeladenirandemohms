import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "STAFF") return forbidden("Only staff members can access this")

  const employees = await prisma.employee.findMany({
    where: {
      employeeStatus: "ACTIVE",
      id: { not: user.employeeId },
      user: { role: { not: "SUPER_ADMIN" } },
      NOT: [
        { jobTitle: { contains: "intern", mode: "insensitive" } },
        { jobTitle: { contains: "associate", mode: "insensitive" } },
        { employmentType: "INTERN" },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      department: { select: { name: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return NextResponse.json({ employees })
}
