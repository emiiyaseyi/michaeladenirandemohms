import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { name, description, divisionId } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const dept = await prisma.department.create({ data: { name, description: description || null, divisionId: divisionId || null } })
  return NextResponse.json({ dept }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { id, name, description, divisionId } = await req.json()
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  const dept = await prisma.department.update({
    where: { id },
    data: { name, description: description || null, divisionId: divisionId || null },
  })
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
