import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewSurveys")
  if (perm) return perm

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const isDefault = searchParams.get("isDefault")

  const templates = await prisma.surveyTemplate.findMany({
    where: {
      ...(type ? { type: type as any } : {}),
      ...(isDefault !== null ? { isDefault: isDefault === "true" } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      isDefault: true,
      status: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
  })

  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canCreateSurvey")
  if (perm) return perm

  const { name, type, description } = await req.json()
  if (!name || !type) return NextResponse.json({ error: "name and type required" }, { status: 400 })

  const template = await prisma.surveyTemplate.create({
    data: { name, type, description: description ?? null, isDefault: false, status: "DRAFT" },
  })

  await logAudit({
    req, actor: user, action: "SURVEY_TEMPLATE_CREATE", entity: "SurveyTemplate", entityId: template.id,
    newValues: { name, type },
  })

  return NextResponse.json({ template }, { status: 201 })
}
