// Shared server-side helpers for the half-year performance appraisal.
import { prisma } from "@/lib/prisma"
import { scoreAppraisal, type RatingRow, type KpiRow } from "@/lib/appraisal-scoring"
import { DEFAULT_WEIGHTS, type SectionWeights } from "@/lib/appraisal-defaults"
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
  const weights: SectionWeights = (a.cycle?.weights as SectionWeights) ?? DEFAULT_WEIGHTS
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
  const s = computeScores(a as any)
  return prisma.appraisal.update({
    where: { id: appraisalId },
    data: {
      behavioural360Score: s.behavioural360Score,
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
  const ratings = (appraisal.ratings ?? []).map((r: any) => {
    // Peers are anonymous to the subject (and to reviewers); only admins see identities.
    const anon = !admin && (r.raterType === "PEER" || r.raterType === "MEMBER")
    return { ...r, raterId: anon ? null : r.raterId }
  })
  // The subject should not see who the assigned peers are (anonymity); admins do.
  let peers = appraisal.peers
  if (!admin) peers = (appraisal.peers ?? []).map((p: any) => ({ id: p.id, status: p.status, submittedAt: p.submittedAt }))
  return { ...appraisal, ratings, peers, _isSubject: isSubject, _admin: admin }
}
