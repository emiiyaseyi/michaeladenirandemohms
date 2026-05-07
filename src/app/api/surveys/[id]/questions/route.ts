import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const { questions } = await req.json()

  await prisma.$transaction(async tx => {
    await tx.surveyQuestion.deleteMany({ where: { surveyId: id } })
    if (questions?.length) {
      await tx.surveyQuestion.createMany({
        data: questions.map((q: any) => ({
          surveyId: id,
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
