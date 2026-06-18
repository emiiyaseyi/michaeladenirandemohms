import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { appraisalInclude, shapeForViewer, relationshipTo, recomputeAndPersist, reviewerCanEdit } from "@/lib/appraisal"
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

  let shaped: any = shapeForViewer(appraisal, user)

  // One reviewer must not see the other reviewer's review (only the employee's + their own).
  // Admins see everything.
  if (!rel.isAdmin && rel.isReviewer) {
    const otherType = rel.isPrimary ? "COUNTER_REVIEWER" : "PRIMARY_REVIEWER"
    shaped = {
      ...shaped,
      ratings: (shaped.ratings ?? []).filter((r: any) => r.raterType !== otherType),
      kpis: (shaped.kpis ?? []).map((k: any) => ({
        ...k,
        primaryScore: rel.isPrimary ? k.primaryScore : null,
        counterScore: rel.isCounter ? k.counterScore : null,
        primaryComment: rel.isPrimary ? k.primaryComment : null,
        counterComment: rel.isCounter ? k.counterComment : null,
        reviewerScore: null, // combined avg would leak the other reviewer's score
      })),
      // Section VII narrative belongs to the primary reviewer; hide it from the counter.
      ...(rel.isCounter ? { keyAchievements: null, areasForImprovement: null, developmentPlan: null, reviewerComments: null } : { counterReviewerComments: null }),
    }
  }

  return NextResponse.json({
    appraisal: shaped,
    relationship: rel,
    cycle: appraisal.cycle,
  })
}

// Employee-side fields (editable while OPEN by the subject). Query/rec ratings are
// DERIVED from the counts server-side, so only counts are accepted here.
const EMPLOYEE_FIELDS = ["employeeComments", "employeeImprovementPlan", "queryWarnings", "queryBadges", "queryComment", "recCount", "meetingEmployeeConfirmed"]
// Reviewer-side fields (team lead / counter). Query & Recommendation HR scores are NOT here —
// those are admin-only (HR_FIELDS).
const REVIEWER_FIELDS = ["keyAchievements", "areasForImprovement", "developmentPlan", "reviewerComments", "meetingReviewerConfirmed"]
// Admin/HR-only fields — Query (V) & Recommendation (VI) HR counts.
const HR_FIELDS = ["queryWarningsHr", "queryBadgesHr", "recCountHr"]

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
  // Reviewers editing reviewer sections — once the employee has submitted, until finalized.
  else if (rel.isReviewer) {
    if (!reviewerCanEdit(appraisal.stage)) return NextResponse.json({ error: "The employee hasn't submitted yet, or the appraisal is finalized" }, { status: 400 })
    for (const f of REVIEWER_FIELDS) if (body[f] !== undefined) data[f] = body[f]
    if (rel.isCounter && body.counterReviewerComments !== undefined) data.counterReviewerComments = body.counterReviewerComments
    if (appraisal.stage === "SUBMITTED") data.stage = "LEAD_REVIEWING"
  }
  // Admin can edit any field at any time before finalize.
  else if (rel.isAdmin) {
    if (appraisal.stage === "FINALIZED") return NextResponse.json({ error: "Appraisal is finalized" }, { status: 400 })
    for (const f of [...EMPLOYEE_FIELDS, ...REVIEWER_FIELDS, ...HR_FIELDS, "counterReviewerComments"]) if (body[f] !== undefined) data[f] = body[f]
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
