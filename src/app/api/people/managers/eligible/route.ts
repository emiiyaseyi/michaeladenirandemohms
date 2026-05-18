import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

// Lists PROJECT_LEADs who aren't yet managers — used by Add Manager picker.
// SUPER_ADMIN only.
export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const eligible = await prisma.employee.findMany({
    where: {
      user: { role: "PROJECT_LEAD" },
      managerEntry: { is: null },
      employeeStatus: { in: ["ACTIVE", "ON_LEAVE"] },
    },
    select: {
      id: true, firstName: true, lastName: true, jobTitle: true,
      profilePhoto: true, employeeId: true,
      department: { select: { name: true } },
      user: { select: { email: true } },
    },
    orderBy: { firstName: "asc" },
  })

  return NextResponse.json({ eligible })
}
