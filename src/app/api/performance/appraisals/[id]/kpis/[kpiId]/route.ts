import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { relationshipTo, recomputeAndPersist, reviewerCanEdit } from "@/lib/appraisal"
import { logAudit } from "@/lib/audit"

async function loadCtx(id: string, kpiId: string) {
  const appraisal = await prisma.appraisal.findUnique({ where: { id }, include: { cycle: true, reviewers: true, peers: true } })
  const row = appraisal ? await prisma.appraisalKpi.findUnique({ where: { id: kpiId } }) : null
  return { appraisal, row }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; kpiId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id, kpiId } = await params
  const { appraisal, row } = await loadCtx(id, kpiId)
  if (!appraisal || !row || row.appraisalId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const rel = relationshipTo(user, appraisal)
  const stage = appraisal.cycle?.stage
  const body = await req.json()
  const data: any = {}

  // Subject: KPI rows are admin-assigned (uploaded by HR). The subject may only self-score,
  // comment, and add an evidence link on their own STAFF rows, while OPEN. Project/deliverable/
  // KPI text and weight are locked. ADMIN rows (Brand, L&D) are fully read-only to staff.
  if (rel.isSubject && stage === "OPEN" && (appraisal.stage === "NOT_STARTED" || appraisal.stage === "DRAFT")) {
    if (row.source !== "STAFF") return NextResponse.json({ error: "This row is scored by admin only" }, { status: 400 })
    if (body.employeeScore !== undefined) data.employeeScore = body.employeeScore === null ? null : Number(body.employeeScore)
    if (body.employeeComment !== undefined) data.employeeComment = body.employeeComment
    if (body.evidenceUrl !== undefined) data.evidenceUrl = body.evidenceUrl
  }
  // Reviewers: score once the employee has submitted, until finalized.
  // ADMIN-source rows (Brand, Learning & Dev) are admin-only - reviewers cannot score them.
  else if (rel.isReviewer && reviewerCanEdit(appraisal.stage)) {
    if (row.source === "ADMIN") return NextResponse.json({ error: "This row is scored by admin only" }, { status: 400 })
    if (rel.isPrimary) {
      if (body.primaryScore !== undefined) data.primaryScore = body.primaryScore === null ? null : Number(body.primaryScore)
      if (body.primaryComment !== undefined) data.primaryComment = body.primaryComment
    }
    if (rel.isCounter) {
      if (body.counterScore !== undefined) data.counterScore = body.counterScore === null ? null : Number(body.counterScore)
      if (body.counterComment !== undefined) data.counterComment = body.counterComment
    }
    if (body.reviewerComment !== undefined) data.reviewerComment = body.reviewerComment
  }
  // Admin: any field at any time before finalize (incl. the fixed ADMIN-source global rows).
  else if (rel.isAdmin && appraisal.stage !== "FINALIZED") {
    for (const f of ["projectName", "deliverable", "kpi", "employeeComment", "reviewerComment", "primaryComment", "counterComment", "evidenceUrl"]) if (body[f] !== undefined) data[f] = body[f]
    for (const f of ["weight", "employeeScore", "primaryScore", "counterScore"]) if (body[f] !== undefined) data[f] = body[f] === null ? null : Number(body[f])
  } else {
    return NextResponse.json({ error: "Cannot edit this KPI now" }, { status: 400 })
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "No editable fields" }, { status: 400 })
  // Each KPI is scored out of its OWN weight - clamp scores to [0, weight].
  const maxScore = Number(data.weight ?? row.weight ?? 0)
  for (const f of ["employeeScore", "primaryScore", "counterScore"]) {
    if (typeof data[f] === "number") data[f] = Math.max(0, Math.min(maxScore, data[f]))
  }
  // Guard: job-specific weights cannot total more than 100.
  if (data.weight !== undefined) {
    const others = await prisma.appraisalKpi.aggregate({ where: { appraisalId: id, id: { not: kpiId } }, _sum: { weight: true } })
    if ((others._sum.weight ?? 0) + Number(data.weight) > 100) {
      return NextResponse.json({ error: "Total job-specific weight cannot exceed 100" }, { status: 400 })
    }
  }
  // Keep the combined reviewerScore in sync (avg of primary+counter).
  const merged = { ...row, ...data }
  const vals = [merged.primaryScore, merged.counterScore].filter((v: any) => typeof v === "number")
  data.reviewerScore = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null

  await prisma.appraisalKpi.update({ where: { id: kpiId }, data })
  await recomputeAndPersist(id)
  await logAudit({ req, actor: user, action: "APPRAISAL_KPI_EDIT", entity: "AppraisalKpi", entityId: kpiId })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; kpiId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id, kpiId } = await params
  const { appraisal, row } = await loadCtx(id, kpiId)
  if (!appraisal || !row || row.appraisalId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const rel = relationshipTo(user, appraisal)
  // KPI rows are admin-assigned - only admins may delete them.
  if (!rel.isAdmin) return NextResponse.json({ error: "KPI rows are managed by HR" }, { status: 400 })
  await prisma.appraisalKpi.delete({ where: { id: kpiId } })
  await recomputeAndPersist(id)
  await logAudit({ req, actor: user, action: "APPRAISAL_KPI_DELETE", entity: "AppraisalKpi", entityId: kpiId })
  return NextResponse.json({ ok: true })
}
