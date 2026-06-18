import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { appraisalInclude, shapeForViewer, relationshipTo, recomputeAndPersist } from "@/lib/appraisal"
import { logAudit } from "@/lib/audit"

async function load(id: string) {
  return prisma.appraisal.findUnique({ where: { id }, include: appraisalInclude() })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params
  const appraisal = await load(id)
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rel = relationshipTo(user, appraisal)
  // Peers/members rate via /rate (privacy-safe); they cannot read the full record.
  if (!rel.canSeeFull) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.json({
    appraisal: shapeForViewer(appraisal, user),
    relationship: rel,
    cycle: appraisal.cycle,
  })
}

// Employee-side fields (editable while OPEN by the subject).
const EMPLOYEE_FIELDS = ["employeeComments", "queryEmployeeRating", "queryWarnings", "queryBadges", "recEmployeeRating", "recCount", "meetingEmployeeConfirmed"]
// Reviewer-side fields (editable during REVIEW by reviewers; counter comment by counter only).
const REVIEWER_FIELDS = ["keyAchievements", "areasForImprovement", "developmentPlan", "reviewerComments", "queryHrRating", "recHrRating", "meetingReviewerConfirmed"]

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params
  const appraisal = await load(id)
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rel = relationshipTo(user, appraisal)
  const cycleStage = appraisal.cycle?.stage
  const body = await req.json()
  const data: any = {}

  // Subject editing their own sections — only while OPEN and not yet submitted.
  if (rel.isSubject) {
    if (cycleStage !== "OPEN" || (appraisal.stage !== "NOT_STARTED" && appraisal.stage !== "DRAFT")) {
      return NextResponse.json({ error: "Your appraisal is locked for editing" }, { status: 400 })
    }
    for (const f of EMPLOYEE_FIELDS) if (body[f] !== undefined) data[f] = body[f]
    if (appraisal.stage === "NOT_STARTED" && Object.keys(data).length) data.stage = "DRAFT"
  }
  // Reviewers editing reviewer sections — during REVIEW only.
  else if (rel.isReviewer) {
    if (cycleStage !== "REVIEW") return NextResponse.json({ error: "Reviewing is not open for this cycle" }, { status: 400 })
    for (const f of REVIEWER_FIELDS) if (body[f] !== undefined) data[f] = body[f]
    if (rel.isCounter && body.counterReviewerComments !== undefined) data.counterReviewerComments = body.counterReviewerComments
    if (appraisal.stage === "SUBMITTED") data.stage = "LEAD_REVIEWING"
  }
  // Admin can edit any field during COMPILING (final adjustments).
  else if (rel.isAdmin) {
    if (cycleStage !== "COMPILING" && cycleStage !== "REVIEW") return NextResponse.json({ error: "Cycle is not in a compileable stage" }, { status: 400 })
    for (const f of [...EMPLOYEE_FIELDS, ...REVIEWER_FIELDS, "counterReviewerComments"]) if (body[f] !== undefined) data[f] = body[f]
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 })

  await prisma.appraisal.update({ where: { id }, data })
  await recomputeAndPersist(id)
  await logAudit({ req, actor: user, action: "APPRAISAL_EDIT", entity: "Appraisal", entityId: id, newValues: data })
  const fresh = await load(id)
  return NextResponse.json({ appraisal: shapeForViewer(fresh, user) })
}
