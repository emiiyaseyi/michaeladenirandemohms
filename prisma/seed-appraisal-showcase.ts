/**
 * LOCAL showcase seed for the appraisal module. NOT for production.
 *
 * 1. Resets all appraisal fills in the active cycle (deletes ratings, nulls KPI scores,
 *    resets each appraisal to NOT_STARTED) — keeps cycle, appraisal shells, reviewers, peers.
 * 2. Clears + repopulates the leaderboard with sample Brand/Learning/Attendance scores.
 * 3. Builds ONE fully-completed, finalized "golden" appraisal: self + primary lead +
 *    counter reviewer + peers + (member upward if available) + admin scores + management comment.
 *
 * Run:  DATABASE_URL="<local>" npx tsx prisma/seed-appraisal-showcase.ts
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { scoreAppraisal, queryPoints, recommendationPoints, type RatingRow, type KpiRow } from "../src/lib/appraisal-scoring"
import { DEFAULT_WEIGHTS, DEFAULT_QUERY_BANDS, DEFAULT_RECOMMENDATION_BANDS, type SectionWeights } from "../src/lib/appraisal-defaults"

const prisma = new PrismaClient()

async function recompute(appraisalId: string) {
  const a = await prisma.appraisal.findUnique({ where: { id: appraisalId }, include: { cycle: true, ratings: true, kpis: true } })
  if (!a) return
  const qBands = (a.cycle?.queryBands as any) ?? DEFAULT_QUERY_BANDS
  const rBands = (a.cycle?.recommendationBands as any) ?? DEFAULT_RECOMMENDATION_BANDS
  const queryEmployeeRating = queryPoints(qBands, a.queryWarnings ?? 0, a.queryBadges ?? 0)
  const queryHrRating = queryPoints(qBands, a.queryWarningsHr ?? 0, a.queryBadgesHr ?? 0)
  const recEmployeeRating = recommendationPoints(rBands, a.recCount ?? 0)
  const recHrRating = recommendationPoints(rBands, a.recCountHr ?? 0)
  const weights: SectionWeights = (a.cycle?.weights as unknown as SectionWeights) ?? DEFAULT_WEIGHTS
  const s = scoreAppraisal({
    ratings: a.ratings as RatingRow[], kpis: a.kpis as KpiRow[], weights,
    queryEmployeeRating, queryHrRating, recEmployeeRating, recHrRating,
  })
  await prisma.appraisal.update({
    where: { id: appraisalId },
    data: {
      queryEmployeeRating, queryHrRating, recEmployeeRating, recHrRating,
      behavioural360Score: s.behavioural360Score, behavioural360Emp: s.behavioural360Emp, behavioural360Rev: s.behavioural360Rev,
      jobScoreEmp: s.jobScoreEmp, jobScoreRev: s.jobScoreRev, coreScoreEmp: s.coreScoreEmp, coreScoreRev: s.coreScoreRev,
      finalEmployeePercent: s.finalEmployeePercent, finalReviewerPercent: s.finalReviewerPercent,
      finalPercent: s.finalPercent, teamLeadPercent: s.teamLeadPercent,
    },
  })
}

async function main() {
  const cycle = await prisma.performanceCycle.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } })
  if (!cycle) { console.error("No active cycle. Run prisma/seed-appraisal.ts first."); process.exit(1) }
  console.log(`Active cycle: ${cycle.name}`)

  const appraisals = await prisma.appraisal.findMany({
    where: { cycleId: cycle.id },
    include: { reviewers: true, peers: true, employee: { select: { id: true, firstName: true, lastName: true, departmentId: true, managerId: true, projectLeadId: true } } },
  })
  const apprIds = appraisals.map(a => a.id)

  // ── 1. Reset all fills ──
  await prisma.appraisalRating.deleteMany({ where: { appraisalId: { in: apprIds } } })
  await prisma.appraisalKpi.updateMany({
    where: { appraisalId: { in: apprIds } },
    data: { employeeScore: null, primaryScore: null, counterScore: null, reviewerScore: null, employeeComment: null, reviewerComment: null, primaryComment: null, counterComment: null, evidenceUrl: null },
  })
  await prisma.appraisal.updateMany({
    where: { id: { in: apprIds } },
    data: {
      stage: "NOT_STARTED", submittedAt: null, finalizedAt: null,
      keyAchievements: null, areasForImprovement: null, developmentPlan: null,
      employeeComments: null, employeeImprovementPlan: null, reviewerComments: null, counterReviewerComments: null, managementComment: null,
      queryWarnings: null, queryBadges: null, queryWarningsHr: null, queryBadgesHr: null, queryEmployeeRating: null, queryHrRating: null, queryComment: null,
      recCount: null, recCountHr: null, recEmployeeRating: null, recHrRating: null, recComment: null,
      meetingEmployeeConfirmed: false, meetingReviewerConfirmed: false,
      behavioural360Score: null, behavioural360Emp: null, behavioural360Rev: null,
      jobScoreEmp: null, jobScoreRev: null, coreScoreEmp: null, coreScoreRev: null,
      finalEmployeePercent: null, finalReviewerPercent: null, finalPercent: null, teamLeadPercent: null,
    },
  })
  await prisma.leaderboardEntry.deleteMany({ where: { cycleId: cycle.id } })
  console.log(`Reset ${apprIds.length} appraisal(s) to NOT_STARTED; cleared ratings, KPI scores, leaderboard.`)

  // ── 2. Sample leaderboard for the first ~10 employees with appraisals ──
  const boardEmployees = appraisals.slice(0, 10)
  const lbData: { cycleId: string; category: string; employeeId: string; score: number; note: string | null; order: number }[] = []
  boardEmployees.forEach((a, i) => {
    lbData.push({ cycleId: cycle.id, category: "BRAND", employeeId: a.employee.id, score: 7 - (i % 4), note: `${90 - i * 3}% of posts engaged`, order: i })
    lbData.push({ cycleId: cycle.id, category: "LEARNING", employeeId: a.employee.id, score: 4 - (i % 3), note: `${3 - (i % 3)} of 3 courses done`, order: i })
    lbData.push({ cycleId: cycle.id, category: "ATTENDANCE", employeeId: a.employee.id, score: 3 - (i % 2), note: i % 2 ? "1 lateness" : "Perfect", order: i })
  })
  if (lbData.length) await prisma.leaderboardEntry.createMany({ data: lbData, skipDuplicates: true })
  console.log(`Seeded ${lbData.length} leaderboard entries.`)

  // ── 3. Golden completed appraisal ──
  // Prefer one with a primary reviewer + peers + a direct report (for member-upward).
  const reports = await prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, select: { id: true, managerId: true, projectLeadId: true } })
  const hasReport = (empId: string) => reports.find(r => r.managerId === empId || r.projectLeadId === empId)
  let golden = appraisals.find(a => a.reviewers.some(r => r.role === "PRIMARY") && a.peers.length >= 2 && hasReport(a.employee.id))
    ?? appraisals.find(a => a.reviewers.some(r => r.role === "PRIMARY") && a.peers.length >= 2)
    ?? appraisals.find(a => a.reviewers.some(r => r.role === "PRIMARY"))
    ?? appraisals[0]
  if (!golden) { console.log("No appraisal to build golden sample."); await done(); return }
  console.log(`Golden sample: ${golden.employee.firstName} ${golden.employee.lastName}`)

  const subjectId = golden.employee.id
  let primaryId = golden.reviewers.find(r => r.role === "PRIMARY")?.reviewerId ?? null
  let counterId = golden.reviewers.find(r => r.role === "COUNTER")?.reviewerId ?? null

  const pickOther = (exclude: (string | null)[]) =>
    appraisals.map(a => a.employee.id).find(id => !exclude.includes(id))

  if (!primaryId) {
    primaryId = pickOther([subjectId]) ?? null
    if (primaryId) await prisma.appraisalReviewer.create({ data: { appraisalId: golden.id, reviewerId: primaryId, role: "PRIMARY" } })
  }
  if (!counterId) {
    counterId = pickOther([subjectId, primaryId]) ?? null
    if (counterId) await prisma.appraisalReviewer.create({ data: { appraisalId: golden.id, reviewerId: counterId, role: "COUNTER" } })
  }

  // Ensure peers (need >=2).
  let peerIds = golden.peers.map(p => p.peerId)
  if (peerIds.length < 2) {
    const extra = appraisals.map(a => a.employee.id).filter(id => ![subjectId, primaryId, counterId, ...peerIds].includes(id)).slice(0, 2 - peerIds.length)
    for (const pid of extra) { await prisma.appraisalPeer.create({ data: { appraisalId: golden.id, peerId: pid, status: "SUBMITTED", submittedAt: new Date() } }); peerIds.push(pid) }
  }
  peerIds = peerIds.slice(0, 3)
  const memberId = hasReport(subjectId)?.id ?? null

  // Fresh STAFF KPI rows (89) + keep ADMIN rows (11) → total 100.
  await prisma.appraisalKpi.deleteMany({ where: { appraisalId: golden.id, source: "STAFF" } })
  const staffKpis = [
    { projectName: "Customer Data Platform", deliverable: "Ship v2 pipeline", kpi: "Deliver ingestion + dashboards by Q2", weight: 40, emp: 35, prim: 33, cnt: 34, evidence: "https://drive.example.com/cdp-v2" },
    { projectName: "Model Monitoring", deliverable: "Drift alerts in prod", kpi: "Alerting live for 5 models", weight: 29, emp: 26, prim: 24, cnt: 25, evidence: "https://github.com/org/monitoring/pull/42" },
    { projectName: "Internal Training", deliverable: "Run 2 workshops", kpi: "2 sessions, >80% satisfaction", weight: 20, emp: 18, prim: 17, cnt: 18, evidence: "https://docs.example.com/workshops" },
  ]
  for (let i = 0; i < staffKpis.length; i++) {
    const k = staffKpis[i]
    await prisma.appraisalKpi.create({ data: {
      appraisalId: golden.id, projectName: k.projectName, deliverable: k.deliverable, kpi: k.kpi, weight: k.weight,
      employeeScore: k.emp, primaryScore: k.prim, counterScore: k.cnt, reviewerScore: (k.prim + k.cnt) / 2,
      employeeComment: "Met the target.", primaryComment: "Solid delivery.", counterComment: "Agree.", evidenceUrl: k.evidence,
      source: "STAFF", order: i,
    } })
  }
  // ADMIN KPI rows scored from the leaderboard (Brand 6/7, Learning 3/4).
  const brandKpi = await prisma.appraisalKpi.findFirst({ where: { appraisalId: golden.id, source: "ADMIN", projectName: { contains: "brand", mode: "insensitive" } } })
  if (brandKpi) await prisma.appraisalKpi.update({ where: { id: brandKpi.id }, data: { employeeScore: Math.min(brandKpi.weight, 6), employeeComment: "92% of posts engaged." } })
  const learnKpi = await prisma.appraisalKpi.findFirst({ where: { appraisalId: golden.id, source: "ADMIN", projectName: { contains: "learning", mode: "insensitive" } } })
  if (learnKpi) await prisma.appraisalKpi.update({ where: { id: learnKpi.id }, data: { employeeScore: Math.min(learnKpi.weight, 3), employeeComment: "3 of 3 courses completed." } })

  // Questions for the cycle.
  const questions = await prisma.appraisalQuestion.findMany({ where: { cycleId: cycle.id }, orderBy: [{ section: "asc" }, { order: "asc" }] })
  const beh = questions.filter(q => q.section === "BEHAVIOURAL")
  const core = questions.filter(q => q.section === "CORE_VALUE")
  const lead = questions.filter(q => q.section === "LEADERSHIP")

  // Build ratings.
  const ratings: { appraisalId: string; raterId: string | null; raterType: any; section: any; questionId: string; score: number; comment: string; isAnonymous: boolean }[] = []
  const add = (raterId: string | null, raterType: string, section: string, qs: typeof questions, score: number, comment: string, anon = false) => {
    for (const q of qs) ratings.push({ appraisalId: golden!.id, raterId, raterType, section, questionId: q.id, score: Math.min(q.scaleMax, score), comment, isAnonymous: anon })
  }
  // Self (behavioural + core).
  add(subjectId, "SELF", "BEHAVIOURAL", beh, 4, "I consistently deliver to standard.")
  add(subjectId, "SELF", "CORE_VALUE", core, 3, "I live this value daily.")
  // Primary lead.
  if (primaryId) { add(primaryId, "PRIMARY_REVIEWER", "BEHAVIOURAL", beh, 4, "Reliable and collaborative."); add(primaryId, "PRIMARY_REVIEWER", "CORE_VALUE", core, 2, "Demonstrates the value well.") }
  // Counter reviewer.
  if (counterId) { add(counterId, "COUNTER_REVIEWER", "BEHAVIOURAL", beh, 4, "Strong contributor."); add(counterId, "COUNTER_REVIEWER", "CORE_VALUE", core, 3, "Consistent.") }
  // Peers (behavioural, anonymous).
  peerIds.forEach((pid, i) => add(pid, "PEER", "BEHAVIOURAL", beh, i === 0 ? 4 : 5, "Great teammate.", true))
  // Member upward (leadership), if the subject leads someone.
  if (memberId && lead.length) add(memberId, "MEMBER", "LEADERSHIP", lead, 4, "Supportive leader.", true)
  // Admin attendance score on the admin-scored core question(s).
  const attendanceQs = core.filter(q => q.adminScored)
  for (const q of attendanceQs) ratings.push({ appraisalId: golden.id, raterId: null, raterType: "ADMIN", section: "CORE_VALUE", questionId: q.id, score: Math.min(q.scaleMax, 3), comment: "Perfect attendance.", isAnonymous: false })
  if (ratings.length) await prisma.appraisalRating.createMany({ data: ratings })

  // Section V–VII narrative + counts + management comment.
  await prisma.appraisal.update({
    where: { id: golden.id },
    data: {
      employeeComments: "A strong half-year; I grew in delivery ownership.",
      employeeImprovementPlan: "Improve estimation accuracy and delegate more.",
      keyAchievements: "Shipped CDP v2; stood up model monitoring across 5 models.",
      areasForImprovement: "Earlier stakeholder updates on at-risk timelines.",
      developmentPlan: "Mentor a junior engineer; complete an advanced MLOps course by year-end.",
      reviewerComments: "Dependable, high-quality output. Ready for more scope.",
      counterReviewerComments: "Concur with the lead. Consistent performer.",
      queryWarnings: 0, queryBadges: 0, queryWarningsHr: 0, queryBadgesHr: 0, queryComment: "No queries this cycle.",
      recCount: 3, recCountHr: 3, recComment: "Recognised in 3 internal shout-outs.",
      meetingEmployeeConfirmed: true, meetingReviewerConfirmed: true,
      managementComment: "Excellent half-year. Management endorses a strong rating and recommends stretch projects next cycle.",
      stage: "FINALIZED", submittedAt: new Date(), finalizedAt: new Date(),
    },
  })
  await recompute(golden.id)
  const fresh = await prisma.appraisal.findUnique({ where: { id: golden.id }, select: { finalPercent: true } })
  console.log(`Golden sample finalized. Final score: ${fresh?.finalPercent?.toFixed(1)}%`)

  await done()
}

async function done() { console.log("Done."); await prisma.$disconnect() }

main().catch(e => { console.error(e); process.exit(1) })
