import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { employees: true, memberships: true } },
      lead: {
        select: { id: true, firstName: true, lastName: true, profilePhoto: true, jobTitle: true },
      },
    },
  })

  return NextResponse.json({ departments })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { name, description, divisionId, leadEmployeeId } = await req.json()
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  if (!leadEmployeeId) return NextResponse.json({ error: "Department lead is required" }, { status: 400 })

  // Validate the lead is a PROJECT_LEAD or holds secondary-admin
  const leadCandidate = await prisma.employee.findUnique({
    where: { id: leadEmployeeId },
    include: { user: { select: { role: true, adminRoles: { include: { adminRole: { select: { slug: true } } } } } } },
  })
  if (!leadCandidate) return NextResponse.json({ error: "Lead employee not found" }, { status: 400 })
  const isPL = leadCandidate.user.role === "PROJECT_LEAD"
  const isSecondaryAdmin = leadCandidate.user.adminRoles.some(r => r.adminRole.slug === "secondary-admin")
  if (!isPL && !isSecondaryAdmin) {
    return NextResponse.json({ error: "Lead must be a Project Lead or secondary admin" }, { status: 400 })
  }

  const dept = await prisma.department.create({
    data: { name, description: description || null, divisionId: divisionId || null, leadEmployeeId },
  })

  // Ensure the lead has a membership row for this department
  await prisma.employeeDepartment.upsert({
    where: { employeeId_departmentId: { employeeId: leadEmployeeId, departmentId: dept.id } },
    create: { employeeId: leadEmployeeId, departmentId: dept.id, isPrimary: !leadCandidate.departmentId },
    update: {},
  })

  return NextResponse.json({ dept }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { id, name, description, divisionId, leadEmployeeId } = await req.json()
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  if (leadEmployeeId !== undefined && !leadEmployeeId) {
    return NextResponse.json({ error: "Department lead is required" }, { status: 400 })
  }

  if (leadEmployeeId) {
    const leadCandidate = await prisma.employee.findUnique({
      where: { id: leadEmployeeId },
      include: { user: { select: { role: true, adminRoles: { include: { adminRole: { select: { slug: true } } } } } } },
    })
    if (!leadCandidate) return NextResponse.json({ error: "Lead employee not found" }, { status: 400 })
    const isPL = leadCandidate.user.role === "PROJECT_LEAD"
    const isSecondaryAdmin = leadCandidate.user.adminRoles.some(r => r.adminRole.slug === "secondary-admin")
    if (!isPL && !isSecondaryAdmin) {
      return NextResponse.json({ error: "Lead must be a Project Lead or secondary admin" }, { status: 400 })
    }
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description || null
  if (divisionId !== undefined) updateData.divisionId = divisionId || null
  if (leadEmployeeId !== undefined) updateData.leadEmployeeId = leadEmployeeId

  const dept = await prisma.department.update({ where: { id }, data: updateData })

  // Ensure the new lead has a membership row
  if (leadEmployeeId) {
    await prisma.employeeDepartment.upsert({
      where: { employeeId_departmentId: { employeeId: leadEmployeeId, departmentId: id } },
      create: { employeeId: leadEmployeeId, departmentId: id, isPrimary: false },
      update: {},
    })
  }

  return NextResponse.json({ dept })
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  // Count both primary (Employee.departmentId) and additional (EmployeeDepartment) memberships
  const [primaryCount, junctionCount] = await Promise.all([
    prisma.employee.count({ where: { departmentId: id } }),
    prisma.employeeDepartment.count({ where: { departmentId: id } }),
  ])
  const total = primaryCount + junctionCount
  if (total > 0) {
    return NextResponse.json({ error: `Cannot delete — ${total} employee(s) are still in this department. Remove them first.` }, { status: 409 })
  }
  await prisma.department.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
