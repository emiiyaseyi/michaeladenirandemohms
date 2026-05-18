import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

// GET /api/settings/departments/members?deptId=xxx — list employees in a department
// Includes both primary (Employee.departmentId) and additional (EmployeeDepartment junction)
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()

  const deptId = req.nextUrl.searchParams.get("deptId")
  if (!deptId) return NextResponse.json({ error: "deptId required" }, { status: 400 })

  const [members, dept] = await Promise.all([
    prisma.employee.findMany({
      where: {
        OR: [
          { departmentId: deptId },
          { departmentMemberships: { some: { departmentId: deptId } } },
        ],
      },
      select: {
        id: true, firstName: true, lastName: true, jobTitle: true,
        employeeStatus: true, profilePhoto: true, hireDate: true,
        departmentId: true,
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.department.findUnique({
      where: { id: deptId },
      select: { id: true, name: true, description: true },
    }),
  ])

  // Annotate each member with isPrimary for this dept
  const enriched = members.map(m => ({ ...m, isPrimary: m.departmentId === deptId }))

  return NextResponse.json({ dept, members: enriched })
}

// POST — assign employee(s) to department (multi-add)
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const body = await req.json()
  const { deptId } = body
  const employeeIds: string[] = body.employeeIds ?? (body.employeeId ? [body.employeeId] : [])
  if (!deptId) return NextResponse.json({ error: "deptId required" }, { status: 400 })
  if (employeeIds.length === 0) return NextResponse.json({ error: "employeeIds required" }, { status: 400 })

  const ops = employeeIds.map(employeeId =>
    prisma.employeeDepartment.upsert({
      where: { employeeId_departmentId: { employeeId, departmentId: deptId } },
      create: { employeeId, departmentId: deptId, isPrimary: false },
      update: {},
    })
  )
  await prisma.$transaction(ops)

  // If any of these employees had no primary dept set, set it to this dept
  await prisma.employee.updateMany({
    where: { id: { in: employeeIds }, departmentId: null },
    data: { departmentId: deptId },
  })

  return NextResponse.json({ ok: true, added: employeeIds.length })
}

// DELETE — remove employee from department; blocks if it's their only one
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const deptId = req.nextUrl.searchParams.get("deptId")
  const employeeId = req.nextUrl.searchParams.get("employeeId")
  if (!deptId || !employeeId) return NextResponse.json({ error: "deptId and employeeId required" }, { status: 400 })

  // Count this employee's total dept memberships
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, departmentId: true, departmentMemberships: { select: { departmentId: true } } },
  })
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const allDeptIds = new Set<string>()
  if (emp.departmentId) allDeptIds.add(emp.departmentId)
  for (const m of emp.departmentMemberships) allDeptIds.add(m.departmentId)
  if (!allDeptIds.has(deptId)) return NextResponse.json({ error: "Employee is not in this department" }, { status: 400 })

  if (allDeptIds.size <= 1) {
    return NextResponse.json({
      error: "This is the employee's only department. Add them to another department first.",
    }, { status: 400 })
  }

  // Remove from junction (if present)
  await prisma.employeeDepartment.deleteMany({ where: { employeeId, departmentId: deptId } })

  // If this was their primary, promote a remaining junction membership to primary
  if (emp.departmentId === deptId) {
    const remaining = await prisma.employeeDepartment.findFirst({
      where: { employeeId, NOT: { departmentId: deptId } },
      orderBy: { createdAt: "asc" },
    })
    await prisma.employee.update({
      where: { id: employeeId },
      data: { departmentId: remaining?.departmentId ?? null },
    })
  }

  return NextResponse.json({ ok: true })
}
