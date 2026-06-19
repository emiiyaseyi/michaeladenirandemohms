import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm

  const { id } = await params
  const body = await req.json()
  const data: any = {}
  if (body.text !== undefined) data.text = body.text
  if (body.scaleMax !== undefined) data.scaleMax = Number(body.scaleMax)
  if (body.order !== undefined) data.order = Number(body.order)
  const question = await prisma.appraisalQuestion.update({ where: { id }, data })
  await logAudit({ req, actor: user, action: "APPRAISAL_QUESTION_EDIT", entity: "AppraisalQuestion", entityId: id })
  return NextResponse.json({ question })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm
  const { id } = await params
  await prisma.appraisalQuestion.delete({ where: { id } })
  await logAudit({ req, actor: user, action: "APPRAISAL_QUESTION_DELETE", entity: "AppraisalQuestion", entityId: id })
  return NextResponse.json({ ok: true })
}
