import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const viewPerm = requirePermission(user, "canViewSurveys")
  if (viewPerm) return viewPerm

  const { id } = await params
  const template = await prisma.surveyTemplate.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  })

  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ template })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canEditSurvey")
  if (perm) return perm

  const { id } = await params
  const data = await req.json()
  const before = await prisma.surveyTemplate.findUnique({ where: { id } })

  const template = await prisma.surveyTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
    },
  })

  const diff = before ? diffFields(before as any, template as any, ["name", "type", "description", "status"] as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "SURVEY_TEMPLATE_EDIT", entity: "SurveyTemplate", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ template })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canDeleteSurvey")
  if (perm) return perm

  const { id } = await params
  const template = await prisma.surveyTemplate.findUnique({ where: { id }, select: { isDefault: true, name: true } })
  if (template?.isDefault) return NextResponse.json({ error: "Cannot delete a default template" }, { status: 400 })

  await prisma.surveyTemplate.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "SURVEY_TEMPLATE_DELETE", entity: "SurveyTemplate", entityId: id,
    oldValues: template ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
