import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { relationshipTo, recomputeAndPersist, isAdminLike } from "@/lib/appraisal"
import { logAudit } from "@/lib/audit"
import { notifyEmployeeSubmitted, notifyFinalized } from "@/lib/appraisal-notify"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params
  const appraisal = await prisma.appraisal.findUnique({
    where: { id },
    include: { cycle: true, reviewers: true, peers: true, employee: { select: { firstName: true, lastName: true } } },
  })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rel = relationshipTo(user, appraisal)
  const { action } = await req.json()
  const cycleStage = appraisal.cycle?.stage

  // ── Employee submits their self-appraisal ──
  if (action === "employeeSubmit") {
    if (!rel.isSubject) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (cycleStage !== "OPEN") return NextResponse.json({ error: "Submission window is closed" }, { status: 400 })
    if (appraisal.stage !== "NOT_STARTED" && appraisal.stage !== "DRAFT") return NextResponse.json({ error: "Already submitted" }, { status: 400 })
    await prisma.appraisal.update({ where: { id }, data: { stage: "SUBMITTED", submittedAt: new Date() } })
    await recomputeAndPersist(id)
    const subjectName = `${appraisal.employee?.firstName ?? ""} ${appraisal.employee?.lastName ?? ""}`.trim()
    await notifyEmployeeSubmitted(appraisal.reviewers.map(r => r.reviewerId), subjectName)
    await logAudit({ req, actor: user, action: "APPRAISAL_EMPLOYEE_SUBMIT", entity: "Appraisal", entityId: id })
    return NextResponse.json({ ok: true, stage: "SUBMITTED" })
  }

  // ── A reviewer (primary/counter) submits their review ──
  if (action === "reviewerSubmit") {
    if (!rel.isReviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (cycleStage !== "REVIEW") return NextResponse.json({ error: "Review window is not open" }, { status: 400 })
    const myRole = rel.isPrimary ? "PRIMARY" : "COUNTER"
    await prisma.appraisalReviewer.updateMany({ where: { appraisalId: id, reviewerId: user.employeeId!, role: myRole as any }, data: { submittedAt: new Date() } })
    // If all assigned reviewers have submitted, mark the appraisal LEAD_DONE.
    const reviewers = await prisma.appraisalReviewer.findMany({ where: { appraisalId: id } })
    const allDone = reviewers.length > 0 && reviewers.every(r => r.submittedAt)
    await prisma.appraisal.update({ where: { id }, data: { stage: allDone ? "LEAD_DONE" : "LEAD_REVIEWING" } })
    await recomputeAndPersist(id)
    await logAudit({ req, actor: user, action: "APPRAISAL_REVIEWER_SUBMIT", entity: "Appraisal", entityId: id, newValues: { role: myRole } })
    return NextResponse.json({ ok: true, allDone })
  }

  // ── Admin finalizes (locks + snapshots scores) ──
  if (action === "finalize") {
    if (!isAdminLike(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (cycleStage !== "COMPILING") return NextResponse.json({ error: "Cycle must be in COMPILING to finalize" }, { status: 400 })
    await recomputeAndPersist(id)
    await prisma.appraisal.update({ where: { id }, data: { stage: "FINALIZED", finalizedAt: new Date() } })
    await notifyFinalized(appraisal.employeeId)
    await logAudit({ req, actor: user, action: "APPRAISAL_FINALIZE", entity: "Appraisal", entityId: id })
    return NextResponse.json({ ok: true, stage: "FINALIZED" })
  }

  // ── Admin reopens (unlock) ──
  if (action === "reopen") {
    if (!isAdminLike(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    await prisma.appraisal.update({ where: { id }, data: { stage: "LEAD_DONE", finalizedAt: null } })
    await logAudit({ req, actor: user, action: "APPRAISAL_REOPEN", entity: "Appraisal", entityId: id })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
