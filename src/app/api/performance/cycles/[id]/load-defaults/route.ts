import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { defaultQuestions, DEFAULT_GLOBAL_KPIS, DEFAULT_WEIGHTS, DEFAULT_QUERY_BANDS, DEFAULT_RECOMMENDATION_BANDS } from "@/lib/appraisal-defaults"

// Load the standard template (questions, global KPIs, weights, bands) into a cycle.
// Only allowed while the cycle is in CONFIG. Replaces existing template rows.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm

  const { id } = await params
  const cycle = await prisma.performanceCycle.findUnique({ where: { id } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
  if (cycle.stage !== "CONFIG") return NextResponse.json({ error: "Defaults can only be loaded while the cycle is in CONFIG" }, { status: 400 })

  await prisma.$transaction([
    prisma.appraisalQuestion.deleteMany({ where: { cycleId: id } }),
    prisma.appraisalGlobalKpi.deleteMany({ where: { cycleId: id } }),
    prisma.appraisalQuestion.createMany({ data: defaultQuestions().map(q => ({ cycleId: id, section: q.section as any, text: q.text, scaleMax: q.scaleMax, order: q.order })) }),
    prisma.appraisalGlobalKpi.createMany({ data: DEFAULT_GLOBAL_KPIS.map((k, i) => ({ cycleId: id, projectName: k.projectName, deliverable: k.deliverable, kpi: k.kpi, weight: k.weight, order: i })) }),
    prisma.performanceCycle.update({ where: { id }, data: { weights: DEFAULT_WEIGHTS as any, queryBands: DEFAULT_QUERY_BANDS as any, recommendationBands: DEFAULT_RECOMMENDATION_BANDS as any } }),
  ])

  await logAudit({ req, actor: user, action: "APPRAISAL_CYCLE_LOAD_DEFAULTS", entity: "PerformanceCycle", entityId: id })
  return NextResponse.json({ ok: true })
}
