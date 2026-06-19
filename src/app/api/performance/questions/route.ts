import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const cycleId = req.nextUrl.searchParams.get("cycleId")
  if (!cycleId) return NextResponse.json({ error: "cycleId required" }, { status: 400 })
  const questions = await prisma.appraisalQuestion.findMany({
    where: { cycleId },
    orderBy: [{ section: "asc" }, { order: "asc" }],
  })
  return NextResponse.json({ questions })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm

  const { cycleId, section, text, scaleMax } = await req.json()
  if (!cycleId || !section || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  const max = await prisma.appraisalQuestion.aggregate({ where: { cycleId, section }, _max: { order: true } })
  const question = await prisma.appraisalQuestion.create({
    data: { cycleId, section, text, scaleMax: Number(scaleMax ?? (section === "CORE_VALUE" ? 3 : 5)), order: (max._max.order ?? -1) + 1 },
  })
  await logAudit({ req, actor: user, action: "APPRAISAL_QUESTION_CREATE", entity: "AppraisalQuestion", entityId: question.id })
  return NextResponse.json({ question }, { status: 201 })
}
