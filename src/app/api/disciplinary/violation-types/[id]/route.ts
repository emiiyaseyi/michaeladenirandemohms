import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  const before = await prisma.violationType.findUnique({ where: { id }, select: { name: true } })
  const type = await prisma.violationType.update({ where: { id }, data: { name: name.trim() } })

  if (before?.name !== type.name) {
    await logAudit({
      req, actor: user, action: "VIOLATION_TYPE_EDIT", entity: "ViolationType", entityId: id,
      oldValues: { name: before?.name }, newValues: { name: type.name },
    })
  }

  return NextResponse.json({ type })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const before = await prisma.violationType.findUnique({ where: { id }, select: { name: true } })
  await prisma.violationType.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "VIOLATION_TYPE_DELETE", entity: "ViolationType", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
