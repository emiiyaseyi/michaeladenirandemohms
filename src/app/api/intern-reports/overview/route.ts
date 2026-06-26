import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

function mondayOf(date: Date): Date {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

// Every Monday whose week starts on/after rangeStart's Monday and on/before rangeEnd
function mondaysInRange(rangeStart: Date, rangeEnd: Date): Date[] {
  const weeks: Date[] = []
  let w = mondayOf(rangeStart)
  while (w <= rangeEnd) {
    weeks.push(new Date(w))
    w = new Date(w); w.setDate(w.getDate() + 7)
  }
  return weeks
}

function computeScore(r: { productivityRating: number | null; ldRating: number | null; reflectionsRating: number | null; attendanceRating: number | null; pointDeduction: number }): number {
  const tl = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
  const att = r.attendanceRating ?? 0
  return Math.max(0, tl + att - (r.pointDeduction ?? 0))
}

const DIST_BANDS = [
  { label: "90-100%", min: 90 },
  { label: "75-89%", min: 75 },
  { label: "50-74%", min: 50 },
  { label: "Below 50%", min: 0 },
]

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const permError = requirePermission(user, "canViewAnalytics")
  if (permError) return permError

  const weekParam = req.nextUrl.searchParams.get("week")
  const fromParam = req.nextUrl.searchParams.get("from")
  const toParam = req.nextUrl.searchParams.get("to")

  let rangeStart: Date
  let rangeEnd: Date
  if (weekParam) {
    rangeStart = mondayOf(new Date(weekParam))
    rangeEnd = new Date(rangeStart); rangeEnd.setDate(rangeStart.getDate() + 4) // Friday
  } else if (fromParam && toParam) {
    rangeStart = new Date(fromParam)
    rangeEnd = new Date(toParam)
  } else {
    rangeStart = mondayOf(new Date())
    rangeEnd = new Date(rangeStart); rangeEnd.setDate(rangeStart.getDate() + 4)
  }

  const weeks = mondaysInRange(rangeStart, rangeEnd)
  const queryFloor = weeks[0] ?? mondayOf(rangeStart)

  const [interns, cfg, reports] = await Promise.all([
    prisma.employee.findMany({
      where: { employeeStatus: "ACTIVE", jobTitle: { contains: "intern", mode: "insensitive" } },
      select: { id: true, internReportStartDate: true, createdAt: true },
    }),
    prisma.internReportSettings.findUnique({ where: { id: "singleton" } }),
    prisma.internWeeklyReport.findMany({
      where: { weekStart: { gte: queryFloor, lte: rangeEnd }, status: { not: "DRAFT" } },
      select: {
        id: true, status: true, lateFlag: true, pointDeduction: true, weekStart: true,
        productivityRating: true, ldRating: true, reflectionsRating: true, attendanceRating: true,
        reviewers: {
          select: {
            reviewerEmployeeId: true, reviewedAt: true,
            productivityRating: true, ldRating: true, reflectionsRating: true,
            reviewer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ])

  // Expected report-slots across the period: each eligible intern counts once per week
  // in range (interns who joined mid-period are only counted from their start week on).
  // Eligibility starts from account creation, not an unset internReportStartDate -
  // matches the same fallback used in api/intern-reports/route.ts.
  const internStartWeeks = interns.map(i => mondayOf(i.internReportStartDate ?? i.createdAt))
  const expectedSlots = weeks.reduce((sum, w) => {
    return sum + internStartWeeks.filter(start => w >= start).length
  }, 0)

  const realSubmissions = reports.filter(r => r.status !== "MISSING")
  const onTime = realSubmissions.filter(r => !r.lateFlag).length
  const late = realSubmissions.filter(r => r.lateFlag).length
  const missing = Math.max(0, expectedSlots - realSubmissions.length)

  const reviewedTL = realSubmissions.filter(r => r.productivityRating !== null)
  const avgTLPct = reviewedTL.length > 0
    ? Math.round(reviewedTL.reduce((s, r) => s + ((r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)), 0) / (reviewedTL.length * 9) * 100)
    : null

  const withAtt = realSubmissions.filter(r => r.attendanceRating !== null)
  const avgAttPct = withAtt.length > 0
    ? Math.round(withAtt.reduce((s, r) => s + (r.attendanceRating ?? 0), 0) / (withAtt.length * 3) * 100)
    : null

  const fullyScored = realSubmissions.filter(r => r.productivityRating !== null && r.attendanceRating !== null)
  const totalPcts = fullyScored.map(r => Math.round(computeScore(r) / 12 * 100))
  const avgTotalPct = totalPcts.length > 0 ? Math.round(totalPcts.reduce((s, p) => s + p, 0) / totalPcts.length) : null

  const distribution = DIST_BANDS.map(b => ({ label: b.label, count: 0 }))
  for (const p of totalPcts) {
    const idx = DIST_BANDS.findIndex(b => p >= b.min) // bands ordered by descending min - first match is correct band
    if (idx >= 0) distribution[idx].count++
  }

  const totalDeductions = reports.reduce((s, r) => s + (r.pointDeduction ?? 0), 0)
  const pendingReviews = realSubmissions.filter(r => r.reviewers.some(rv => !rv.reviewedAt)).length
  const pendingAttendance = realSubmissions.filter(r => r.attendanceRating === null).length

  // Reviewer deadline is fixed per-report (days after that report's own weekStart, WAT time) -
  // computed per-row so multi-week ranges judge "overdue" correctly for every week, not just one.
  const now = new Date()
  const deadlineFor = (weekStart: Date) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + (cfg?.reviewerDeadlineDay ?? 7))
    d.setUTCHours((cfg?.reviewerDeadlineHour ?? 8) - 1, cfg?.reviewerDeadlineMinute ?? 0, 0, 0)
    return d
  }

  const tlMap = new Map<string, { employeeId: string; name: string; assigned: number; reviewed: number; overdue: number; scoreSum: number; scoreCount: number }>()
  for (const r of realSubmissions) {
    const deadline = deadlineFor(r.weekStart)
    for (const rv of r.reviewers) {
      if (!tlMap.has(rv.reviewerEmployeeId)) {
        tlMap.set(rv.reviewerEmployeeId, {
          employeeId: rv.reviewerEmployeeId,
          name: rv.reviewer ? `${rv.reviewer.firstName} ${rv.reviewer.lastName}` : "Unknown",
          assigned: 0, reviewed: 0, overdue: 0, scoreSum: 0, scoreCount: 0,
        })
      }
      const entry = tlMap.get(rv.reviewerEmployeeId)!
      entry.assigned++
      if (rv.reviewedAt) {
        entry.reviewed++
        entry.scoreSum += (rv.productivityRating ?? 0) + (rv.ldRating ?? 0) + (rv.reflectionsRating ?? 0)
        entry.scoreCount++
      } else if (now >= deadline) {
        entry.overdue++
      }
    }
  }

  const teamLeads = [...tlMap.values()]
    .map(t => ({
      employeeId: t.employeeId,
      name: t.name,
      assigned: t.assigned,
      reviewed: t.reviewed,
      overdue: t.overdue,
      avgScoreGivenPct: t.scoreCount > 0 ? Math.round(t.scoreSum / (t.scoreCount * 9) * 100) : null,
    }))
    .sort((a, b) => b.overdue - a.overdue || b.assigned - a.assigned)

  return NextResponse.json({
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    weeksInRange: weeks.length,
    totalInterns: expectedSlots, onTime, late, missing,
    avgTLPct, avgAttPct, avgTotalPct,
    distribution,
    totalDeductions,
    pendingReviews, pendingAttendance,
    teamLeads,
  })
}
