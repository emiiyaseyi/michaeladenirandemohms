import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

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

  return NextResponse.json({ response }, { status: 201 })
}
