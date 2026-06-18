// Appraisal scoring engine.
//
// Design (confirmed with stakeholders):
//  • 360 Behavioural = mean of ALL behavioural rating rows pooled equally:
//      - PEER rows (peers rating the subject), and
//      - MEMBER rows (direct reports rating the subject — only when subject is a lead).
//    Each item is on a 0–5 scale, so the pool normalises to a fraction of 5.
//  • Team Leads Score = MEMBER-only pool (the standalone "Team Leads Score"), present
//    only when the subject has direct reports who rated them.
//  • Core Values = self vs reviewer, each item 0–3. Reviewer per item = avg(primary, counter).
//  • Job-Specific = Σ(weight_i × score_i / KPI_SCORE_SCALE); employee vs reviewer columns.
//    Reviewer per KPI = avg(primary, counter) where both present, else whichever is set.
//  • Query = raw negative points (band-derived). Recommendation = raw positive points.
//  • Overall % = behavioural(weighted) + job(weighted) + coreValues(weighted)
//                + recommendation points + query points. Reviewer total is the official %.

import { KPI_SCORE_SCALE, type SectionWeights, DEFAULT_WEIGHTS } from "./appraisal-defaults"

export interface RatingRow {
  raterType: "SELF" | "PEER" | "MEMBER" | "PRIMARY_REVIEWER" | "COUNTER_REVIEWER"
  section: "BEHAVIOURAL" | "CORE_VALUE" | "PEER"
  questionId?: string | null
  score?: number | null
}

export interface KpiRow {
  weight?: number | null
  employeeScore?: number | null
  primaryScore?: number | null
  counterScore?: number | null
}

export interface ScoreInput {
  ratings: RatingRow[]
  kpis: KpiRow[]
  weights?: SectionWeights | null
  queryEmployeeRating?: number | null
  queryHrRating?: number | null
  recEmployeeRating?: number | null
  recHrRating?: number | null
}

const num = (v: number | null | undefined) => (typeof v === "number" && !Number.isNaN(v) ? v : 0)
const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

// Average primary + counter where present; falls back to whichever single value exists.
export function reviewerAvg(primary?: number | null, counter?: number | null): number | null {
  const vals = [primary, counter].filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export interface ScoreResult {
  behavioural360Score: number      // raw pooled mean (0–5)
  behavioural360Pct: number        // 0–1 fraction
  teamLeadScore: number | null     // MEMBER-only pooled mean (0–5)
  teamLeadPercent: number | null   // 0–100
  hasMemberRatings: boolean
  coreScoreEmp: number             // sum of self item scores
  coreScoreRev: number             // sum of reviewer item scores
  coreMax: number
  jobScoreEmp: number              // 0–100
  jobScoreRev: number              // 0–100
  recPointsEmp: number
  recPointsRev: number
  queryPointsEmp: number
  queryPointsRev: number
  finalEmployeePercent: number     // 0–100
  finalReviewerPercent: number     // 0–100 (official appraisal score)
  finalPercent: number             // = reviewer
}

export function scoreAppraisal(input: ScoreInput): ScoreResult {
  const w = input.weights ?? DEFAULT_WEIGHTS

  // ── 360 Behavioural — pool PEER + MEMBER rows equally (each 0–5) ──
  const behavPool = input.ratings
    .filter(r => (r.raterType === "PEER" || r.raterType === "MEMBER") && typeof r.score === "number")
    .map(r => num(r.score))
  const memberPool = input.ratings
    .filter(r => r.raterType === "MEMBER" && typeof r.score === "number")
    .map(r => num(r.score))

  const behavioural360Score = mean(behavPool)
  const behavioural360Pct = behavioural360Score / 5
  const hasMemberRatings = memberPool.length > 0
  const teamLeadScore = hasMemberRatings ? mean(memberPool) : null
  const teamLeadPercent = teamLeadScore === null ? null : (teamLeadScore / 5) * 100

  // ── Core Values — self vs reviewer per item (0–3) ──
  const coreSelf = input.ratings.filter(r => r.section === "CORE_VALUE" && r.raterType === "SELF")
  const corePrimary = input.ratings.filter(r => r.section === "CORE_VALUE" && r.raterType === "PRIMARY_REVIEWER")
  const coreCounter = input.ratings.filter(r => r.section === "CORE_VALUE" && r.raterType === "COUNTER_REVIEWER")

  const coreScoreEmp = coreSelf.reduce((a, r) => a + num(r.score), 0)
  // reviewer core = per-question avg(primary, counter)
  const coreQIds = new Set<string>()
  ;[...corePrimary, ...coreCounter].forEach(r => { if (r.questionId) coreQIds.add(r.questionId) })
  let coreScoreRev = 0
  coreQIds.forEach(qid => {
    const p = corePrimary.find(r => r.questionId === qid)?.score
    const c = coreCounter.find(r => r.questionId === qid)?.score
    coreScoreRev += reviewerAvg(p, c) ?? 0
  })
  // core max = number of core questions × 3 (derive from self count, fallback to reviewer count)
  const coreItemCount = Math.max(coreSelf.length, coreQIds.size)
  const coreMax = coreItemCount * 3

  // ── Job-Specific — weighted ──
  let jobScoreEmp = 0
  let jobScoreRev = 0
  for (const k of input.kpis) {
    const wt = num(k.weight)
    jobScoreEmp += (wt * num(k.employeeScore)) / KPI_SCORE_SCALE
    const rev = reviewerAvg(k.primaryScore, k.counterScore)
    jobScoreRev += (wt * num(rev)) / KPI_SCORE_SCALE
  }

  // ── Recommendation / Query — raw points ──
  const recPointsEmp = num(input.recEmployeeRating)
  const recPointsRev = num(input.recHrRating)
  const queryPointsEmp = num(input.queryEmployeeRating)
  const queryPointsRev = num(input.queryHrRating)

  // ── Weighted section contributions ──
  const behavWeighted = behavioural360Pct * w.behavioural
  const jobWeightedEmp = (jobScoreEmp / 100) * w.jobSpecific
  const jobWeightedRev = (jobScoreRev / 100) * w.jobSpecific
  const coreWeightedEmp = coreMax ? (coreScoreEmp / coreMax) * w.coreValues : 0
  const coreWeightedRev = coreMax ? (coreScoreRev / coreMax) * w.coreValues : 0

  // 360 behavioural is a pooled crowd score — contributes equally to both columns.
  const finalEmployeePercent = clampPct(behavWeighted + jobWeightedEmp + coreWeightedEmp + recPointsEmp + queryPointsEmp)
  const finalReviewerPercent = clampPct(behavWeighted + jobWeightedRev + coreWeightedRev + recPointsRev + queryPointsRev)

  return {
    behavioural360Score: round2(behavioural360Score),
    behavioural360Pct: round2(behavioural360Pct),
    teamLeadScore: teamLeadScore === null ? null : round2(teamLeadScore),
    teamLeadPercent: teamLeadPercent === null ? null : round2(teamLeadPercent),
    hasMemberRatings,
    coreScoreEmp: round2(coreScoreEmp),
    coreScoreRev: round2(coreScoreRev),
    coreMax,
    jobScoreEmp: round2(jobScoreEmp),
    jobScoreRev: round2(jobScoreRev),
    recPointsEmp, recPointsRev, queryPointsEmp, queryPointsRev,
    finalEmployeePercent: round2(finalEmployeePercent),
    finalReviewerPercent: round2(finalReviewerPercent),
    finalPercent: round2(finalReviewerPercent),
  }
}

function clampPct(v: number) { return Math.max(0, Math.min(100, v)) }
function round2(v: number) { return Math.round(v * 100) / 100 }

// ── Band helpers ──
import type { QueryBand, RecommendationBand } from "./appraisal-defaults"

// Query points from counts: take the worst (most negative) matching band for warnings and badges.
export function queryPoints(bands: QueryBand[], warnings: number, badges: number): number {
  let pts = 0
  const warnBands = bands.filter(b => typeof b.warnings === "number").sort((a, b) => b.warnings! - a.warnings!)
  const badgeBands = bands.filter(b => typeof b.badges === "number").sort((a, b) => b.badges! - a.badges!)
  const w = warnBands.find(b => warnings >= b.warnings!)
  const g = badgeBands.find(b => badges >= b.badges!)
  if (w) pts += w.points
  if (g) pts += g.points
  return pts
}

export function recommendationPoints(bands: RecommendationBand[], count: number): number {
  if (count <= 0) return 0
  const sorted = [...bands].sort((a, b) => b.min - a.min)
  const band = sorted.find(b => count >= b.min)
  return band ? band.points : 0
}
