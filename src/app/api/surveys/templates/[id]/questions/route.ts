import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const { id } = await params
  const { questions } = await req.json()

  await prisma.$transaction(async tx => {
    await tx.surveyTemplateQuestion.deleteMany({ where: { templateId: id } })
    if (questions?.length) {
      await tx.surveyTemplateQuestion.createMany({
        data: questions.map((q: any) => ({
          templateId: id,
          text: q.text,
          qType: q.qType ?? "TEXT",
          options: q.options ?? [],
          order: q.order ?? 0,
          required: q.required ?? false,
        })),
      })
    }
  })

  return NextResponse.json({ ok: true })
}
