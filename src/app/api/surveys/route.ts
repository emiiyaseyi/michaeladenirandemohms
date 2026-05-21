import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")

  const surveys = await prisma.survey.findMany({
    where: type ? { type: type as any } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      isAnonymous: true,
      status: true,
      dueDate: true,
      createdAt: true,
      _count: { select: { questions: true, responses: true } },
    },
  })

  return NextResponse.json({ surveys })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const { title, type, isAnonymous } = await req.json()
  if (!title || !type) return NextResponse.json({ error: "title and type required" }, { status: 400 })

  const survey = await prisma.survey.create({
    data: { title, type, isAnonymous: isAnonymous ?? false, status: "DRAFT" },
  })

  await logAudit({
    req, actor: user, action: "SURVEY_CREATE", entity: "Survey", entityId: survey.id,
    newValues: { title, type, isAnonymous },
  })

  return NextResponse.json({ survey }, { status: 201 })
}
