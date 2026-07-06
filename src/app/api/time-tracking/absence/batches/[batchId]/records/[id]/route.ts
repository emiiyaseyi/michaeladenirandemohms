import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

const ALLOWED_FIELDS = ["status", "note"] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canEditAbsence")
  if (perm) return perm

  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) data[key] = body[key]
  }

  const before = await prisma.absenceRecord.findUnique({ where: { id } })
  const record = await prisma.absenceRecord.update({ where: { id }, data })

  const diff = before ? diffFields(before as any, record as any, ALLOWED_FIELDS as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "ABSENCE_RECORD_EDIT", entity: "AbsenceRecord", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ record })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canDeleteAbsence")
  if (perm) return perm

  const { id } = await params
  const before = await prisma.absenceRecord.findUnique({ where: { id } })
  await prisma.absenceRecord.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "ABSENCE_RECORD_DELETE", entity: "AbsenceRecord", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
