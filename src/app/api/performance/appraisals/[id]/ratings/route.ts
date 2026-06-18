import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { relationshipTo, recomputeAndPersist } from "@/lib/appraisal"
import { logAudit } from "@/lib/audit"

// Submit a batch of ratings for one (section, raterType) from the caller.
// Replaces the caller's previous rows for that section+type (idempotent re-submit).
//
// Authorised combinations:
//   SELF             + CORE_VALUE   → subject, while OPEN
//   PEER             + PEER         → assigned peer, while OPEN (marks peer SUBMITTED)
//   MEMBER           + BEHAVIOURAL  → a direct report of the subject, while OPEN
//   PRIMARY/COUNTER  + CORE_VALUE   → assigned reviewer, while REVIEW
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params
  const appraisal = await prisma.appraisal.findUnique({
    where: { id },
    include: { cycle: true, reviewers: true, peers: true, employee: { select: { id: true } } },
  })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const rel = relationshipTo(user, appraisal)
  const stage = appraisal.cycle?.stage
  const eid = user.employeeId
  if (!eid) return NextResponse.json({ error: "No employee profile" }, { status: 400 })

  const { section, raterType, ratings, submit } = await req.json() as {
    section: "CORE_VALUE" | "PEER" | "BEHAVIOURAL"
    raterType: "SELF" | "PEER" | "MEMBER" | "PRIMARY_REVIEWER" | "COUNTER_REVIEWER"
    ratings: { questionId: string; score?: number | null; comment?: string | null }[]
    submit?: boolean
  }
  if (!Array.isArray(ratings)) return NextResponse.json({ error: "ratings array required" }, { status: 400 })
  // Comments are mandatory — every item must have a score and a non-empty comment.
  for (const r of ratings) {
    if (r.score === null || r.score === undefined || Number.isNaN(Number(r.score))) {
      return NextResponse.json({ error: "Give every item a score." }, { status: 400 })
    }
    if (!r.comment || !String(r.comment).trim()) {
      return NextResponse.json({ error: "A comment is required for every item." }, { status: 400 })
    }
  }

  // ── Authorise the combination ──
  let allowed = false
  let isAnonymous = true
  if (raterType === "SELF" && section === "CORE_VALUE") {
    allowed = rel.isSubject && stage === "OPEN" && (appraisal.stage === "NOT_STARTED" || appraisal.stage === "DRAFT")
    isAnonymous = false
  } else if (raterType === "PEER" && section === "PEER") {
    allowed = rel.isPeer && stage === "OPEN"
  } else if (raterType === "MEMBER" && section === "BEHAVIOURAL") {
    // caller must be a direct report (manager/projectLead) of the subject
    const me = await prisma.employee.findUnique({ where: { id: eid }, select: { managerId: true, projectLeadId: true } })
    allowed = stage === "OPEN" && !!me && (me.managerId === appraisal.employeeId || me.projectLeadId === appraisal.employeeId)
  } else if ((raterType === "PRIMARY_REVIEWER" || raterType === "COUNTER_REVIEWER") && section === "CORE_VALUE") {
    allowed = (raterType === "PRIMARY_REVIEWER" ? rel.isPrimary : rel.isCounter) && stage === "REVIEW"
    isAnonymous = false
  }
  if (!allowed) return NextResponse.json({ error: "Not allowed to submit these ratings now" }, { status: 403 })

  // Replace the caller's prior rows for this section+type.
  await prisma.appraisalRating.deleteMany({ where: { appraisalId: id, raterId: eid, raterType: raterType as any, section: section as any } })
  await prisma.appraisalRating.createMany({
    data: ratings
      .filter(r => r.questionId)
      .map(r => ({
        appraisalId: id, raterId: eid, raterType: raterType as any, section: section as any,
        questionId: r.questionId, score: r.score == null ? null : Number(r.score), comment: r.comment ?? null, isAnonymous,
      })),
  })

  // Mark peer task submitted.
  if (raterType === "PEER" && submit) {
    await prisma.appraisalPeer.updateMany({ where: { appraisalId: id, peerId: eid }, data: { status: "SUBMITTED", submittedAt: new Date() } })
  }

  await recomputeAndPersist(id)
  await logAudit({ req, actor: user, action: "APPRAISAL_RATINGS_SUBMIT", entity: "Appraisal", entityId: id, newValues: { section, raterType, count: ratings.length } })
  return NextResponse.json({ ok: true })
}
