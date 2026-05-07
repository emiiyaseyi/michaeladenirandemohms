import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden("No access to settings")
  const [departments, divisions, leaveTypes, holidays] = await Promise.all([
    prisma.department.findMany({ include: { division: true, _count: { select: { employees: true } } }, orderBy: { name: "asc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
    prisma.leaveType.findMany({ orderBy: { name: "asc" } }),
    (prisma as any).publicHoliday.findMany({ where: { year: new Date().getFullYear() }, orderBy: { date: "asc" } }),
  ])
  return NextResponse.json({ departments, divisions, leaveTypes, holidays })
}
