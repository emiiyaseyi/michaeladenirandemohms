import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { employees: true } },
    },
  })

  // Find department leads: an employee whose projectLeadId is set and belongs to each dept
  // The lead is the employee referenced by projectLeadId of dept members
  const deptIds = departments.map(d => d.id)
  // Find one representative employee per dept who has a projectLeadId
  const repEmployees = await prisma.employee.findMany({
    where: { departmentId: { in: deptIds }, projectLeadId: { not: null } },
    select: { departmentId: true, projectLeadId: true },
    distinct: ["departmentId"],
  })
  const leadIds = [...new Set(repEmployees.map(e => e.projectLeadId).filter(Boolean))] as string[]
  const leads = leadIds.length > 0 ? await prisma.employee.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, firstName: true, lastName: true, profilePhoto: true, jobTitle: true },
  }) : []
  const leadMap: Record<string, any> = {}
  for (const lead of leads) leadMap[lead.id] = lead
  const deptLeadIdMap: Record<string, string> = {}
  for (const e of repEmployees) {
    if (e.departmentId && e.projectLeadId) deptLeadIdMap[e.departmentId] = e.projectLeadId
  }

  const deptsWithLeads = departments.map(d => ({
    ...d,
    lead: deptLeadIdMap[d.id] ? (leadMap[deptLeadIdMap[d.id]] ?? null) : null,
  }))

  return NextResponse.json({ departments: deptsWithLeads })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { name, description, divisionId, leadId } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const dept = await prisma.department.create({ data: { name, description: description || null, divisionId: divisionId || null } })

  if (leadId) {
    await prisma.employee.updateMany({
      where: { departmentId: dept.id },
      data: { projectLeadId: leadId },
    })
  }

  return NextResponse.json({ dept }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { id, name, description, divisionId, leadId } = await req.json()
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  const dept = await prisma.department.update({
    where: { id },
    data: { name, description: description || null, divisionId: divisionId || null },
  })

  if (leadId !== undefined) {
    await prisma.employee.updateMany({
      where: { departmentId: id },
      data: { projectLeadId: leadId || null },
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
  const count = await prisma.employee.count({ where: { departmentId: id } })
  if (count > 0) return NextResponse.json({ error: `Cannot delete — ${count} employee(s) are in this department` }, { status: 409 })
  await prisma.department.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
