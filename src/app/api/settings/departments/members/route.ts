import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

// GET /api/settings/departments/members?deptId=xxx — list employees in a department
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()

  const deptId = req.nextUrl.searchParams.get("deptId")
  if (!deptId) return NextResponse.json({ error: "deptId required" }, { status: 400 })

  const [members, dept] = await Promise.all([
    prisma.employee.findMany({
      where: { departmentId: deptId },
      select: { id: true, firstName: true, lastName: true, jobTitle: true, employeeStatus: true, profilePhoto: true, hireDate: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.department.findUnique({
      where: { id: deptId },
      select: { id: true, name: true, description: true },
    }),
  ])

  return NextResponse.json({ dept, members })
}

// POST — assign employee to department
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { deptId, employeeId } = await req.json()
  if (!deptId || !employeeId) return NextResponse.json({ error: "deptId and employeeId required" }, { status: 400 })

  const emp = await prisma.employee.update({
    where: { id: employeeId },
    data: { departmentId: deptId },
    select: { id: true, firstName: true, lastName: true, jobTitle: true },
  })
  return NextResponse.json({ employee: emp })
}

// DELETE — remove employee from department (set to null)
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const employeeId = req.nextUrl.searchParams.get("employeeId")
  if (!employeeId) return NextResponse.json({ error: "employeeId required" }, { status: 400 })

  await prisma.employee.update({
    where: { id: employeeId },
    data: { departmentId: null },
  })
  return NextResponse.json({ ok: true })
}
