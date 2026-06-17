import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "PROJECT_LEAD") return forbidden("Project Lead only")

  const { searchParams } = req.nextUrl
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""

  // Get departments this PL leads
  const plDepts = await prisma.projectLeadDepartment.findMany({
    where: { userId: user.id },
    select: { departmentId: true },
  })
  const deptIds = plDepts.map(d => d.departmentId)

  if (deptIds.length === 0) {
    return NextResponse.json({ employees: [] })
  }

  const employees = await prisma.employee.findMany({
    where: {
      departmentId: { in: deptIds },
      ...(status && status !== "ALL" ? { employeeStatus: status as any } : {}),
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { jobTitle: { contains: search, mode: "insensitive" } },
          { employeeId: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    select: {
      id: true, firstName: true, lastName: true, jobTitle: true,
      profilePhoto: true, employeeId: true, employeeStatus: true,
      employmentType: true, phone: true, gender: true,
      department: { select: { id: true, name: true } },
      user: { select: { email: true } },
    },
    orderBy: { firstName: "asc" },
  })

  return NextResponse.json({ employees })
}
