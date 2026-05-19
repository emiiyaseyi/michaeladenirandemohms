import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const { answers } = await req.json()

  const survey = await prisma.survey.findUnique({ where: { id }, select: { id: true, isAnonymous: true } })
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
    select: { id: true },
  })

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: id,
      employeeId: survey.isAnonymous ? null : (employee?.id ?? null),
      completedAt: new Date(),
      answers: {
        create: Object.entries(answers as Record<string, string>).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      },
    },
  })

  await logAudit({
    req, actor: user, action: "SURVEY_RESPOND", entity: "Survey", entityId: id,
    targetUserId: survey.isAnonymous ? null : user.id,
    newValues: { isAnonymous: survey.isAnonymous, questionCount: Object.keys(answers).length },
  })

  return NextResponse.json({ response }, { status: 201 })
}
