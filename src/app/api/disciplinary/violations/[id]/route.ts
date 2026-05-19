import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const before = await prisma.violation.findUnique({ where: { id }, include: { employee: { select: { userId: true } } } })
  const violation = await prisma.violation.update({ where: { id }, data: body })

  const diff = before ? diffFields(before as any, violation as any, Object.keys(body) as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "VIOLATION_EDIT", entity: "Violation", entityId: id,
      targetUserId: before?.employee?.userId ?? null,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ violation })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const before = await prisma.violation.findUnique({ where: { id }, include: { employee: { select: { userId: true } } } })
  await prisma.violation.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "VIOLATION_DELETE", entity: "Violation", entityId: id,
    targetUserId: before?.employee?.userId ?? null,
    oldValues: before ? { details: before.details, status: before.status, incidentDate: before.incidentDate } : undefined,
  })

  return NextResponse.json({ ok: true })
}
