// Shared server-side helpers for the half-year performance appraisal.
import { prisma } from "@/lib/prisma"
import { scoreAppraisal, queryPoints, recommendationPoints, type RatingRow, type KpiRow } from "@/lib/appraisal-scoring"
import { DEFAULT_WEIGHTS, DEFAULT_QUERY_BANDS, DEFAULT_RECOMMENDATION_BANDS, type SectionWeights } from "@/lib/appraisal-defaults"
import type { SessionUser } from "@/lib/api-auth"

export async function getActiveCycle() {
  return prisma.performanceCycle.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } })
}

// Full appraisal with everything needed for scoring + display.
export function appraisalInclude() {
  return {
    cycle: true,
    employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true, departmentId: true } },
    ratings: true,
    kpis: { orderBy: { order: "asc" as const } },
    reviewers: { include: { reviewer: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } } },
    peers: { include: { peer: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } } },
  }
}

type AppraisalWithRel = {
  ratings: { raterType: any; section: any; questionId: string | null; score: number | null }[]
  kpis: { weight: number | null; employeeScore: number | null; primaryScore: number | null; counterScore: number | null }[]
  cycle: { weights: any } | null
  queryEmployeeRating: number | null
  queryHrRating: number | null
  recEmployeeRating: number | null
  recHrRating: number | null
}

export function computeScores(a: AppraisalWithRel) {
  const weights: SectionWeights = (a.cycle?.weights as unknown as SectionWeights) ?? DEFAULT_WEIGHTS
  return scoreAppraisal({
    ratings: a.ratings as RatingRow[],
    kpis: a.kpis as KpiRow[],
    weights,
    queryEmployeeRating: a.queryEmployeeRating,
    queryHrRating: a.queryHrRating,
    recEmployeeRating: a.recEmployeeRating,
    recHrRating: a.recHrRating,
  })
}

// Recompute and persist the score snapshot onto the appraisal row.
export async function recomputeAndPersist(appraisalId: string) {
  const a = await prisma.appraisal.findUnique({
    where: { id: appraisalId },
    include: { cycle: true, ratings: true, kpis: true },
  })
  if (!a) return null

  // Derive Query (V) + Recommendation (VI) points from the entered COUNTS, using the cycle's bands.
  const qBands = (a.cycle?.queryBands as any) ?? DEFAULT_QUERY_BANDS
  const rBands = (a.cycle?.recommendationBands as any) ?? DEFAULT_RECOMMENDATION_BANDS
  const queryEmployeeRating = queryPoints(qBands, a.queryWarnings ?? 0, a.queryBadges ?? 0)
  const queryHrRating = queryPoints(qBands, a.queryWarningsHr ?? 0, a.queryBadgesHr ?? 0)
  const recEmployeeRating = recommendationPoints(rBands, a.recCount ?? 0)
  const recHrRating = recommendationPoints(rBands, a.recCountHr ?? 0)

  const weights: SectionWeights = (a.cycle?.weights as unknown as SectionWeights) ?? DEFAULT_WEIGHTS
  const s = scoreAppraisal({
    ratings: a.ratings as RatingRow[],
    kpis: a.kpis as KpiRow[],
    weights,
    queryEmployeeRating, queryHrRating, recEmployeeRating, recHrRating,
  })
  return prisma.appraisal.update({
    where: { id: appraisalId },
    data: {
      queryEmployeeRating, queryHrRating, recEmployeeRating, recHrRating,
      behavioural360Score: s.behavioural360Score,
      behavioural360Emp: s.behavioural360Emp,
      behavioural360Rev: s.behavioural360Rev,
      jobScoreEmp: s.jobScoreEmp,
      jobScoreRev: s.jobScoreRev,
      coreScoreEmp: s.coreScoreEmp,
      coreScoreRev: s.coreScoreRev,
      finalEmployeePercent: s.finalEmployeePercent,
      finalReviewerPercent: s.finalReviewerPercent,
      finalPercent: s.finalPercent,
      teamLeadPercent: s.teamLeadPercent,
    },
  })
}

// A reviewer (primary/counter) may fill their review once the employee has submitted
// and until the appraisal is finalized — independent of the global cycle stage.
export function reviewerCanEdit(appraisalStage: string): boolean {
  return appraisalStage === "SUBMITTED" || appraisalStage === "LEAD_REVIEWING" || appraisalStage === "LEAD_DONE"
}

export function isSuperAdmin(user: SessionUser) {
  return user.role === "SUPER_ADMIN"
}

export function isAdminLike(user: SessionUser) {
  return user.role === "SUPER_ADMIN" || !!user.permissions["canViewPerformance"] || !!user.permissions["canCompileAppraisals"]
}

// Ordered peer candidates for an employee: same-department colleagues first, then
// everyone else as fallback (small org — peer review is anonymous, so cross-dept is
// safe when a department lacks enough people). Excludes the subject. Caller slices
// to the needed count, so the department-priority order must be preserved (do NOT
// re-sort the result).
export async function peerCandidatesOf(employeeId: string): Promise<string[]> {
  const me = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { departmentId: true, secondaryDepartmentIds: true },
  })
  if (!me) return []
  const deptIds = [me.departmentId, ...(me.secondaryDepartmentIds ?? [])].filter(Boolean) as string[]
  const all = await prisma.employee.findMany({
    where: { employeeStatus: "ACTIVE", id: { not: employeeId } },
    select: { id: true, departmentId: true },
    orderBy: { firstName: "asc" },
  })
  const inDept = (e: { departmentId: string | null }) => !!e.departmentId && deptIds.includes(e.departmentId)
  const sameDept = all.filter(inDept).map(e => e.id)
  const others = all.filter(e => !inDept(e)).map(e => e.id)
  return [...sameDept, ...others]
}

export interface Relationship {
  isSubject: boolean
  isPrimary: boolean
  isCounter: boolean
  isReviewer: boolean
  isPeer: boolean
  isAdmin: boolean
  canSeeFull: boolean
}

// Determine the caller's relationship to an appraisal. Pass an appraisal that
// includes `reviewers` and `peers`.
export function relationshipTo(user: SessionUser, appraisal: any): Relationship {
  const eid = user.employeeId
  const isAdmin = isAdminLike(user)
  const isSubject = !!eid && appraisal.employeeId === eid
  const isPrimary = !!eid && (appraisal.reviewers ?? []).some((r: any) => r.reviewerId === eid && r.role === "PRIMARY")
  const isCounter = !!eid && (appraisal.reviewers ?? []).some((r: any) => r.reviewerId === eid && r.role === "COUNTER")
  const isPeer = !!eid && (appraisal.peers ?? []).some((p: any) => p.peerId === eid)
  const isReviewer = isPrimary || isCounter
  return { isSubject, isPrimary, isCounter, isReviewer, isPeer, isAdmin, canSeeFull: isAdmin || isSubject || isReviewer }
}

// Anonymise peer ratings for non-admin viewers: strip rater identity.
export function shapeForViewer(appraisal: any, user: SessionUser) {
  const admin = isAdminLike(user)
  const isSubject = appraisal.employeeId === user.employeeId
  // Peer (PEER) and team-member upward (MEMBER) reviews are visible ONLY to admins.
  // Everyone else (subject, reviewers) does not see these rows at all — the scores still
  // roll up into the 360 total server-side, but the individual rows are hidden.
  const ratings = admin
    ? (appraisal.ratings ?? [])
    : (appraisal.ratings ?? []).filter((r: any) => r.raterType !== "PEER" && r.raterType !== "MEMBER")
  // The subject should not see who the assigned peers are (anonymity); admins do.
  let peers = appraisal.peers
  if (!admin) peers = (appraisal.peers ?? []).map((p: any) => ({ id: p.id, status: p.status, submittedAt: p.submittedAt }))
  return { ...appraisal, ratings, peers, _isSubject: isSubject, _admin: admin }
}
