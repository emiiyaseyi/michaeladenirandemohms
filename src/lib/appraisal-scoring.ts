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
//  • Job-Specific = Σ(score_i) where each KPI is scored out of its own weight_i; weights sum to 100.
//    Reviewer per KPI = avg(primary, counter) where both present, else whichever is set.
//  • Query = raw negative points (band-derived). Recommendation = raw positive points.
//  • Overall % = behavioural(weighted) + job(weighted) + coreValues(weighted)
//                + recommendation points + query points. Reviewer total is the official %.

import { type SectionWeights, DEFAULT_WEIGHTS } from "./appraisal-defaults"

export interface RatingRow {
  raterType: "SELF" | "PEER" | "MEMBER" | "PRIMARY_REVIEWER" | "COUNTER_REVIEWER" | "ADMIN"
  section: "BEHAVIOURAL" | "LEADERSHIP" | "CORE_VALUE" | "PEER"
  questionId?: string | null
  score?: number | null
}

export interface KpiRow {
  weight?: number | null
  employeeScore?: number | null
  primaryScore?: number | null
  counterScore?: number | null
  source?: string | null
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
  behavioural360Score: number      // headline reviewer-side pooled mean (0–5)
  behavioural360Emp: number        // self behavioural mean (0–5)
  behavioural360Rev: number        // lead + peer + member-upward mean (0–5)
  behavioural360Pct: number        // 0–1 fraction (reviewer side)
  teamLeadScore: number | null     // MEMBER-on-LEADERSHIP pooled mean (0–5)
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

  // ── 360 Behavioural (Section II, scale 0–5) ──
  // Employee column = the subject's OWN self ratings.
  // Reviewer column = team lead (primary/counter) + peers + (for leads) member-upward — pooled equally.
  const isBehav = (r: RatingRow) => r.section === "BEHAVIOURAL" && typeof r.score === "number"
  const selfBehav = input.ratings.filter(r => r.raterType === "SELF" && isBehav(r)).map(r => num(r.score))
  const revBehav = input.ratings
    .filter(r => (r.raterType === "PRIMARY_REVIEWER" || r.raterType === "COUNTER_REVIEWER" || r.raterType === "PEER") && isBehav(r))
    .map(r => num(r.score))
  // Upward leadership ratings (a lead's reports) — feed the reviewer pool + Team Lead Score.
  const memberLead = input.ratings
    .filter(r => r.raterType === "MEMBER" && r.section === "LEADERSHIP" && typeof r.score === "number")
    .map(r => num(r.score))

  const behavioural360Emp = mean(selfBehav)
  const reviewerBehavPool = [...revBehav, ...memberLead]
  const behavioural360Rev = mean(reviewerBehavPool)
  const behavioural360Score = behavioural360Rev
  const behavioural360Pct = behavioural360Rev / 5
  const hasMemberRatings = memberLead.length > 0
  const teamLeadScore = hasMemberRatings ? mean(memberLead) : null
  const teamLeadPercent = teamLeadScore === null ? null : (teamLeadScore / 5) * 100

  // ── Core Values — self vs reviewer per item (0–3) ──
  const coreSelf = input.ratings.filter(r => r.section === "CORE_VALUE" && r.raterType === "SELF")
  const corePrimary = input.ratings.filter(r => r.section === "CORE_VALUE" && r.raterType === "PRIMARY_REVIEWER")
  const coreCounter = input.ratings.filter(r => r.section === "CORE_VALUE" && r.raterType === "COUNTER_REVIEWER")
  const coreAdmin = input.ratings.filter(r => r.section === "CORE_VALUE" && r.raterType === "ADMIN")

  const coreScoreEmp = coreSelf.reduce((a, r) => a + num(r.score), 0)
  // reviewer core = per-question mean of present reviewer-side scores (primary, counter, admin).
  // The admin score only exists on admin-scored items (e.g. attendance) → that item averages lead + admin.
  const coreQIds = new Set<string>()
  ;[...corePrimary, ...coreCounter, ...coreAdmin].forEach(r => { if (r.questionId) coreQIds.add(r.questionId) })
  let coreScoreRev = 0
  coreQIds.forEach(qid => {
    const vals = [
      corePrimary.find(r => r.questionId === qid)?.score,
      coreCounter.find(r => r.questionId === qid)?.score,
      coreAdmin.find(r => r.questionId === qid)?.score,
    ].filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
    if (vals.length) coreScoreRev += vals.reduce((a, b) => a + b, 0) / vals.length
  })
  // core max = number of core questions × 3 (derive from self count, fallback to reviewer count)
  const coreItemCount = Math.max(coreSelf.length, coreQIds.size)
  const coreMax = coreItemCount * 3

  // ── Job-Specific — each KPI is scored out of its OWN assigned weight (no fixed scale).
  // The weights sum to 100, so the raw job total is 0–100; it's then scaled to the
  // section weight in the overall roll-up. ADMIN-source rows (Brand, L&D) are admin-scored
  // and count the same for both the employee and reviewer columns. ──
  let jobScoreEmp = 0
  let jobScoreRev = 0
  for (const k of input.kpis) {
    const wt = num(k.weight)
    const clampW = (v: number | null | undefined) => Math.max(0, Math.min(wt, num(v)))
    if (k.source === "ADMIN") {
      const adminScore = clampW(k.employeeScore)
      jobScoreEmp += adminScore
      jobScoreRev += adminScore
    } else {
      jobScoreEmp += clampW(k.employeeScore)
      jobScoreRev += clampW(reviewerAvg(k.primaryScore, k.counterScore))
    }
  }
  jobScoreEmp = Math.min(100, jobScoreEmp)
  jobScoreRev = Math.min(100, jobScoreRev)

  // ── Recommendation / Query — raw points ──
  const recPointsEmp = num(input.recEmployeeRating)
  const recPointsRev = num(input.recHrRating)
  const queryPointsEmp = num(input.queryEmployeeRating)
  const queryPointsRev = num(input.queryHrRating)

  // ── Weighted section contributions (Employee = self; Reviewer = lead + 360) ──
  const behavWeightedEmp = (behavioural360Emp / 5) * w.behavioural
  const behavWeightedRev = (behavioural360Rev / 5) * w.behavioural
  const jobWeightedEmp = (jobScoreEmp / 100) * w.jobSpecific
  const jobWeightedRev = (jobScoreRev / 100) * w.jobSpecific
  const coreWeightedEmp = coreMax ? (coreScoreEmp / coreMax) * w.coreValues : 0
  const coreWeightedRev = coreMax ? (coreScoreRev / coreMax) * w.coreValues : 0

  const finalEmployeePercent = clampPct(behavWeightedEmp + jobWeightedEmp + coreWeightedEmp + recPointsEmp + queryPointsEmp)
  const finalReviewerPercent = clampPct(behavWeightedRev + jobWeightedRev + coreWeightedRev + recPointsRev + queryPointsRev)

  return {
    behavioural360Score: round2(behavioural360Score),
    behavioural360Emp: round2(behavioural360Emp),
    behavioural360Rev: round2(behavioural360Rev),
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

// Query points from counts. Each band's `warnings`/`badges` is the UPPER bound of a
// range (e.g. warnings:2 = "1–2 warnings", warnings:4 = "3–4 warnings"). For a given
// count, pick the band with the smallest upper bound that still covers it; if the count
// exceeds every band, use the highest band. Counts of 0 score nothing.
function bandForCount<T extends { points: number }>(bands: (T & { threshold: number })[], count: number): T | null {
  if (count <= 0 || !bands.length) return null
  const asc = [...bands].sort((a, b) => a.threshold - b.threshold)
  return asc.find(b => count <= b.threshold) ?? asc[asc.length - 1]
}

export function queryPoints(bands: QueryBand[], warnings: number, badges: number): number {
  let pts = 0
  const warnBands = bands.filter(b => typeof b.warnings === "number").map(b => ({ ...b, threshold: b.warnings! }))
  const badgeBands = bands.filter(b => typeof b.badges === "number").map(b => ({ ...b, threshold: b.badges! }))
  const w = bandForCount(warnBands, warnings)
  const g = bandForCount(badgeBands, badges)
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
