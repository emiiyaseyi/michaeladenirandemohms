import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewAllEmployees) return forbidden()

  const managers = await prisma.employee.findMany({
    where: { directReports: { some: {} } },
    select: {
      id: true, firstName: true, lastName: true, jobTitle: true,
      profilePhoto: true, employeeId: true, workEmail: true,
      _count: { select: { directReports: true } },
    },
    orderBy: { firstName: "asc" },
  })

  return NextResponse.json({ managers })
}
