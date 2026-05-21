import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
  })

  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ survey })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const { id } = await params
  const data = await req.json()
  const before = await prisma.survey.findUnique({ where: { id } })

  const survey = await prisma.survey.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.isAnonymous !== undefined && { isAnonymous: data.isAnonymous }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
    },
  })

  const diff = before ? diffFields(before as any, survey as any, ["title", "type", "isAnonymous", "status", "dueDate"] as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "SURVEY_EDIT", entity: "Survey", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ survey })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const { id } = await params
  const before = await prisma.survey.findUnique({ where: { id }, select: { title: true } })
  await prisma.survey.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "SURVEY_DELETE", entity: "Survey", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
