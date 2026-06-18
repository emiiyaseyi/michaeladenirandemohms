import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isAdminLike } from "@/lib/appraisal"

// Per-cycle analytics for the admin dashboard. ?cycleId= (defaults to most recent).
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminLike(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Cycle list (for prev/next navigation), newest first.
  const cycles = await prisma.performanceCycle.findMany({
    orderBy: [{ year: "desc" }, { half: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, year: true, half: true, stage: true, isActive: true },
  })
  if (!cycles.length) return NextResponse.json({ cycles: [], cycle: null, analytics: null })

  const cycleId = req.nextUrl.searchParams.get("cycleId") ?? cycles[0].id
  const cycle = cycles.find(c => c.id === cycleId) ?? cycles[0]

  const appraisals = await prisma.appraisal.findMany({
    where: { cycleId: cycle.id },
    select: {
      id: true, stage: true,
      finalPercent: true, finalReviewerPercent: true, finalEmployeePercent: true,
      behavioural360Score: true, jobScoreRev: true, coreScoreRev: true, teamLeadPercent: true,
      employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, department: { select: { name: true } } } },
      _count: { select: { peers: true, reviewers: true } },
      peers: { select: { status: true } },
      reviewers: { select: { submittedAt: true } },
    },
  })

  const total = appraisals.length
  const byStage: Record<string, number> = {}
  for (const a of appraisals) byStage[a.stage] = (byStage[a.stage] ?? 0) + 1

  const submitted = appraisals.filter(a => a.stage !== "NOT_STARTED" && a.stage !== "DRAFT").length
  const reviewed = appraisals.filter(a => a.stage === "LEAD_DONE" || a.stage === "FINALIZED").length
  const finalized = appraisals.filter(a => a.stage === "FINALIZED")

  const peersAssigned = appraisals.reduce((s, a) => s + a._count.peers, 0)
  const peersSubmitted = appraisals.reduce((s, a) => s + a.peers.filter(p => p.status === "SUBMITTED").length, 0)
  const reviewersAssigned = appraisals.reduce((s, a) => s + a._count.reviewers, 0)
  const reviewersSubmitted = appraisals.reduce((s, a) => s + a.reviewers.filter(r => r.submittedAt).length, 0)

  const avg = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => typeof v === "number")
    return nums.length ? Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 100) / 100 : null
  }
  // Score basis: finalized appraisals' official (reviewer) percent.
  const finalPctVals = finalized.map(a => a.finalPercent ?? a.finalReviewerPercent)
  const averages = {
    finalPercent: avg(finalPctVals),
    employeePercent: avg(finalized.map(a => a.finalEmployeePercent)),
    behavioural360: avg(finalized.map(a => a.behavioural360Score)),
    jobScoreRev: avg(finalized.map(a => a.jobScoreRev)),
    coreScoreRev: avg(finalized.map(a => a.coreScoreRev)),
    teamLeadPercent: avg(finalized.map(a => a.teamLeadPercent)),
  }

  // Distribution of final scores (finalized only).
  const bands = [
    { label: "0–39%", min: 0, max: 39.999, count: 0 },
    { label: "40–59%", min: 40, max: 59.999, count: 0 },
    { label: "60–74%", min: 60, max: 74.999, count: 0 },
    { label: "75–100%", min: 75, max: 100, count: 0 },
  ]
  for (const v of finalPctVals) {
    if (typeof v !== "number") continue
    const b = bands.find(b => v >= b.min && v <= b.max)
    if (b) b.count++
  }

  // Ranked finalized performers.
  const ranked = finalized
    .filter(a => typeof (a.finalPercent ?? a.finalReviewerPercent) === "number")
    .map(a => ({
      id: a.id,
      name: `${a.employee.firstName} ${a.employee.lastName}`.trim(),
      jobTitle: a.employee.jobTitle ?? null,
      department: a.employee.department?.name ?? null,
      percent: a.finalPercent ?? a.finalReviewerPercent ?? 0,
    }))
    .sort((x, y) => y.percent - x.percent)

  // Per-department average (finalized).
  const deptMap = new Map<string, number[]>()
  for (const a of finalized) {
    const d = a.employee.department?.name ?? "—"
    const v = a.finalPercent ?? a.finalReviewerPercent
    if (typeof v === "number") { if (!deptMap.has(d)) deptMap.set(d, []); deptMap.get(d)!.push(v) }
  }
  const byDepartment = Array.from(deptMap.entries())
    .map(([name, vals]) => ({ name, avg: avg(vals), count: vals.length }))
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))

  return NextResponse.json({
    cycles,
    cycle,
    analytics: {
      total, byStage,
      participation: { submitted, reviewed, finalized: finalized.length, peersAssigned, peersSubmitted, reviewersAssigned, reviewersSubmitted },
      averages,
      distribution: bands,
      top: ranked.slice(0, 5),
      bottom: ranked.slice(-5).reverse(),
      byDepartment,
    },
  })
}
