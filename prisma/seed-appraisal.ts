/**
 * Production-safe appraisal seed. ADDITIVE - never deletes data.
 *
 * Creates the active half-year appraisal cycle (if missing), loads the standard
 * template (questions, global KPIs, weights, bands), then generates one appraisal
 * per ACTIVE employee (primary reviewer = project lead / manager) and auto-assigns
 * department-based peers. Idempotent: re-running only tops up what's missing.
 *
 * Does NOT create any test/login accounts.
 *
 * Run against prod:  DATABASE_URL="<prod>" npx tsx prisma/seed-appraisal.ts
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { defaultQuestions, DEFAULT_GLOBAL_KPIS, DEFAULT_WEIGHTS, DEFAULT_QUERY_BANDS, DEFAULT_RECOMMENDATION_BANDS } from "../src/lib/appraisal-defaults"

const prisma = new PrismaClient()

async function main() {
  const year = new Date().getFullYear()
  const cycleName = `H1 ${year} Performance Appraisal`

  let cycle = await prisma.performanceCycle.findFirst({ where: { name: cycleName } })
  if (!cycle) {
    cycle = await prisma.performanceCycle.create({
      data: {
        name: cycleName, year, half: 1,
        startDate: new Date(`${year}-01-01`), endDate: new Date(`${year}-06-30`),
        kpiDeadline: new Date(`${year}-06-15`),
        isActive: true, stage: "OPEN", peerCount: 3,
        weights: DEFAULT_WEIGHTS as any,
        queryBands: DEFAULT_QUERY_BANDS as any,
        recommendationBands: DEFAULT_RECOMMENDATION_BANDS as any,
        questions: { create: defaultQuestions().map(q => ({ section: q.section as any, text: q.text, scaleMax: q.scaleMax, order: q.order, adminScored: q.adminScored ?? false })) },
        globalKpis: { create: DEFAULT_GLOBAL_KPIS.map((k, i) => ({ projectName: k.projectName, deliverable: k.deliverable, kpi: k.kpi, weight: k.weight, order: i })) },
      },
    })
    await prisma.performanceCycle.updateMany({ where: { isActive: true, id: { not: cycle.id } }, data: { isActive: false } })
    console.log(`Created cycle "${cycleName}" (OPEN)`)
  } else {
    console.log(`Cycle "${cycleName}" exists - topping up`)
  }

  // Top-up appraisals for active employees without one.
  const globalKpis = await prisma.appraisalGlobalKpi.findMany({ where: { cycleId: cycle.id }, orderBy: { order: "asc" } })
  const employees = await prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, select: { id: true, projectLeadId: true, managerId: true } })
  const existing = new Set((await prisma.appraisal.findMany({ where: { cycleId: cycle.id }, select: { employeeId: true } })).map(a => a.employeeId))
  let created = 0
  for (const emp of employees) {
    if (existing.has(emp.id)) continue
    const primaryReviewerId = emp.projectLeadId ?? emp.managerId ?? null
    await prisma.appraisal.create({
      data: {
        cycleId: cycle.id, employeeId: emp.id, stage: "NOT_STARTED",
        kpis: { create: globalKpis.map(g => ({ projectName: g.projectName, deliverable: g.deliverable, kpi: g.kpi, weight: g.weight, source: "ADMIN" as const, order: g.order })) },
        ...(primaryReviewerId && primaryReviewerId !== emp.id ? { reviewers: { create: { reviewerId: primaryReviewerId, role: "PRIMARY" as const } } } : {}),
      },
    })
    created++
  }

  // Auto-assign peers from the same department (cross-dept fallback), up to peerCount each.
  const allActive = await prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, select: { id: true, departmentId: true } })
  const dept = new Map(allActive.map(e => [e.id, e.departmentId]))
  const appraisals = await prisma.appraisal.findMany({ where: { cycleId: cycle.id }, include: { reviewers: true, peers: true } })
  let peersAssigned = 0
  for (const a of appraisals) {
    if (a.peers.length >= (cycle.peerCount ?? 3)) continue
    const myDept = dept.get(a.employeeId) ?? null
    const excluded = new Set<string>([a.employeeId, ...a.reviewers.map(r => r.reviewerId), ...a.peers.map(p => p.peerId)])
    const pool = allActive.filter(e => !excluded.has(e.id))
    const sameDept = pool.filter(e => myDept && e.departmentId === myDept).map(e => e.id)
    const others = pool.filter(e => !(myDept && e.departmentId === myDept)).map(e => e.id)
    const pick = [...sameDept, ...others].slice(0, (cycle.peerCount ?? 3) - a.peers.length)
    for (const peerId of pick) { await prisma.appraisalPeer.create({ data: { appraisalId: a.id, peerId } }); peersAssigned++ }
  }

  console.log(`Appraisals: ${appraisals.length} total (${created} new). Peers assigned this run: ${peersAssigned}.`)
  console.log("Done.")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
