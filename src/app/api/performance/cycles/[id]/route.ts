import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"
import { notifyReviewStageOpened, notifyFinalReport } from "@/lib/appraisal-notify"
import { generateTeamLeadReportsForCycle } from "@/lib/team-lead-report"

const STAGE_ORDER = ["CONFIG", "OPEN", "REVIEW", "COMPILING", "FINALIZED"] as const

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params
  const cycle = await prisma.performanceCycle.findUnique({
    where: { id },
    include: {
      questions: { orderBy: [{ section: "asc" }, { order: "asc" }] },
      globalKpis: { orderBy: { order: "asc" } },
      _count: { select: { appraisals: true } },
    },
  })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
  return NextResponse.json({ cycle })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm

  const { id } = await params
  const cycle = await prisma.performanceCycle.findUnique({ where: { id } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

  const body = await req.json()

  if (body.action === "activate") {
    await prisma.performanceCycle.updateMany({ where: { isActive: true }, data: { isActive: false } })
    const updated = await prisma.performanceCycle.update({ where: { id }, data: { isActive: true } })
    await logAudit({ req, actor: user, action: "APPRAISAL_CYCLE_ACTIVATE", entity: "PerformanceCycle", entityId: id })
    return NextResponse.json({ cycle: updated })
  }
  if (body.action === "close") {
    // Closing the cycle sends the final report email to every staff member with a
    // finalized appraisal. The cycle must be at the FINALIZED stage first. closedAt
    // guards send-once: re-closing an already-closed cycle does not re-send.
    if (cycle.stage !== "FINALIZED") {
      return NextResponse.json({ error: "Move the cycle to the Finalized stage before closing — final report emails go out on close." }, { status: 400 })
    }
    const alreadyClosed = !!cycle.closedAt
    const updated = await prisma.performanceCycle.update({ where: { id }, data: { isActive: false, closedAt: cycle.closedAt ?? new Date() } })
    // Refresh team-lead syntheses to capture late/reopened upward reviews before reports go out.
    await generateTeamLeadReportsForCycle(id)
    if (!alreadyClosed) await notifyFinalReport(id)
    await logAudit({ req, actor: user, action: "APPRAISAL_CYCLE_CLOSE", entity: "PerformanceCycle", entityId: id, newValues: { emailsSent: !alreadyClosed } })
    return NextResponse.json({ cycle: updated, emailsSent: !alreadyClosed })
  }
  if (body.action === "setStage") {
    const stage = body.stage as string
    if (!STAGE_ORDER.includes(stage as any)) return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
    const updated = await prisma.performanceCycle.update({ where: { id }, data: { stage: stage as any } })
    if (stage === "REVIEW") {
      const reviewers = await prisma.appraisalReviewer.findMany({ where: { appraisal: { cycleId: id } }, select: { reviewerId: true } })
      await notifyReviewStageOpened(reviewers.map(r => r.reviewerId))
      // Members rate upward during OPEN, so the data is ready — synthesize each lead's report.
      await generateTeamLeadReportsForCycle(id)
    }
    await logAudit({ req, actor: user, action: "APPRAISAL_CYCLE_STAGE", entity: "PerformanceCycle", entityId: id, newValues: { stage } })
    return NextResponse.json({ cycle: updated })
  }

  // General config update (name, dates, weights, peerCount, bands)
  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.startDate) data.startDate = new Date(body.startDate)
  if (body.endDate) data.endDate = new Date(body.endDate)
  if (body.kpiDeadline !== undefined) data.kpiDeadline = body.kpiDeadline ? new Date(body.kpiDeadline) : null
  if (body.peerCount !== undefined) data.peerCount = Number(body.peerCount)
  if (body.weights !== undefined) data.weights = body.weights
  if (body.queryBands !== undefined) data.queryBands = body.queryBands
  if (body.recommendationBands !== undefined) data.recommendationBands = body.recommendationBands

  const updated = await prisma.performanceCycle.update({ where: { id }, data })
  const diff = diffFields(cycle as any, updated as any, ["name", "startDate", "endDate", "kpiDeadline", "peerCount"])
  await logAudit({ req, actor: user, action: "APPRAISAL_CYCLE_EDIT", entity: "PerformanceCycle", entityId: id, oldValues: diff?.old, newValues: diff?.new })
  return NextResponse.json({ cycle: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm

  const { id } = await params
  const apprCount = await prisma.appraisal.count({ where: { cycleId: id } })
  if (apprCount > 0) return NextResponse.json({ error: "Cannot delete a cycle that already has appraisals" }, { status: 400 })

  const before = await prisma.performanceCycle.findUnique({ where: { id } })
  await prisma.performanceCycle.delete({ where: { id } })
  await logAudit({ req, actor: user, action: "APPRAISAL_CYCLE_DELETE", entity: "PerformanceCycle", entityId: id, oldValues: before ?? undefined })
  return NextResponse.json({ ok: true })
}
