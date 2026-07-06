import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageSuspensions")
  if (perm) return perm

  const { id } = await params
  const body = await req.json()
  const before = await prisma.suspension.findUnique({ where: { id }, include: { employee: { select: { userId: true } } } })
  const suspension = await prisma.suspension.update({ where: { id }, data: body })

  const diff = before ? diffFields(before as any, suspension as any, Object.keys(body) as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "SUSPENSION_EDIT", entity: "Suspension", entityId: id,
      targetUserId: before?.employee?.userId ?? null,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ suspension })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageSuspensions")
  if (perm) return perm

  const { id } = await params
  const before = await prisma.suspension.findUnique({ where: { id }, include: { employee: { select: { userId: true } } } })
  await prisma.suspension.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "SUSPENSION_DELETE", entity: "Suspension", entityId: id,
    targetUserId: before?.employee?.userId ?? null,
    oldValues: before ? { startDate: before.startDate, endDate: before.endDate, status: before.status, reason: before.reason } : undefined,
  })

  return NextResponse.json({ ok: true })
}
