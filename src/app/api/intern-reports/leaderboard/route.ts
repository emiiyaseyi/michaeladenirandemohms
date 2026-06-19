import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

function computeScore(r: any): number {
  const tl = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
  const att = r.attendanceRating ?? 0
  return Math.max(0, tl + att - (r.pointDeduction ?? 0))
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function addWeeks(date: Date, n: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + n * 7); return d
}

// Count consecutive submitted/reviewed weeks going back from anchorWeek (inclusive)
function computeStreak(
  reportMap: Map<string, string>,
  anchorWeek: Date,
): number {
  const GOOD = new Set(["SUBMITTED", "LATE", "REVIEWED", "ATTENDANCE_FILLED"])
  let streak = 0
  let week = getWeekMonday(anchorWeek)
  for (let i = 0; i < 104; i++) { // cap at 2 years
    const key = week.toISOString().slice(0, 10)
    const status = reportMap.get(key)
    if (!status || !GOOD.has(status)) break
    streak++
    week = addWeeks(week, -1)
  }
  return streak
}

function assignRanks(scored: any[]): void {
  let rank = 1
  for (let i = 0; i < scored.length; i++) {
    if (i > 0 && scored[i].totalScore < scored[i - 1].totalScore && !scored[i].attendancePending) {
      rank = i + 1
    }
    scored[i].rank = scored[i].attendancePending ? null : rank
  }
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const url = req.nextUrl
  const mode = url.searchParams.get("mode") ?? "week"
  const weekParam = url.searchParams.get("week")
  const fromParam = url.searchParams.get("from")
  const toParam = url.searchParams.get("to")

  // Determine date range
  let rangeStart: Date | undefined
  let rangeEnd: Date | undefined
  let anchorWeek: Date

  if (mode === "week" || (!mode && weekParam)) {
    anchorWeek = weekParam ? getWeekMonday(new Date(weekParam)) : getWeekMonday(new Date())
    rangeStart = anchorWeek
    rangeEnd = anchorWeek
  } else if (mode === "month" && fromParam) {
    rangeStart = new Date(fromParam); rangeStart.setHours(0, 0, 0, 0)
    const end = new Date(rangeStart); end.setMonth(end.getMonth() + 1); end.setDate(0)
    rangeEnd = end
    anchorWeek = getWeekMonday(rangeEnd)
  } else if (mode === "custom" && fromParam && toParam) {
    rangeStart = new Date(fromParam); rangeStart.setHours(0, 0, 0, 0)
    rangeEnd = new Date(toParam); rangeEnd.setHours(23, 59, 59, 999)
    anchorWeek = getWeekMonday(rangeEnd)
  } else {
    // alltime
    anchorWeek = getWeekMonday(new Date())
  }

  const whereDate = rangeStart && rangeEnd
    ? { weekStart: { gte: rangeStart, lte: rangeEnd } }
    : {}

  // Fetch reports for the selected period
  const reports = await prisma.internWeeklyReport.findMany({
    where: {
      ...whereDate,
      employee: { jobTitle: { contains: "intern", mode: "insensitive" } },
    },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, jobTitle: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { weekStart: "desc" },
  })

  // For streak: fetch all-time reports for each unique employee
  const empIds = [...new Set(reports.map(r => r.employeeId))]
  const allReports = empIds.length > 0
    ? await prisma.internWeeklyReport.findMany({
        where: { employeeId: { in: empIds } },
        select: { employeeId: true, weekStart: true, status: true },
        orderBy: { weekStart: "desc" },
      })
    : []

  // Build per-employee report maps for streak calc
  const reportsByEmp = new Map<string, Map<string, string>>()
  for (const r of allReports) {
    if (!reportsByEmp.has(r.employeeId)) reportsByEmp.set(r.employeeId, new Map())
    reportsByEmp.get(r.employeeId)!.set(r.weekStart.toISOString().slice(0, 10), r.status)
  }

  if (mode === "week" || (!mode)) {
    // Single-week mode: keep existing scoring logic + add streak
    const weekStart = anchorWeek!
    const weekReports = reports.filter(r => r.weekStart.toISOString().slice(0, 10) === weekStart.toISOString().slice(0, 10))
    const scored = weekReports.map(r => {
      const totalScore = computeScore(r)
      const plScore = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
      const streak = computeStreak(reportsByEmp.get(r.employeeId) ?? new Map(), weekStart)
      return {
        reportId: r.id,
        employeeId: r.employeeId,
        name: `${r.employee.firstName} ${r.employee.lastName}`,
        dept: r.employee.department?.name ?? "–",
        status: r.status,
        totalHours: r.totalHours,
        plScore,
        plScorePct: Math.round((plScore / 9) * 100),
        attendanceRating: r.attendanceRating,
        attendanceScorePct: r.attendanceRating !== null ? Math.round((r.attendanceRating / 3) * 100) : null,
        pointDeduction: r.pointDeduction,
        totalScore,
        totalScorePct: Math.round((totalScore / 12) * 100),
        attendancePending: r.attendanceRating === null,
        streak,
      }
    })

    scored.sort((a, b) => {
      if (a.attendancePending && !b.attendancePending) return 1
      if (!a.attendancePending && b.attendancePending) return -1
      return b.totalScore - a.totalScore
    })
    assignRanks(scored)
    return NextResponse.json({ leaderboard: scored, weekStart: weekStart.toISOString(), mode: "week" })
  }

  // Multi-period: aggregate by employee
  const byEmp = new Map<string, {
    employee: any
    reports: any[]
  }>()
  for (const r of reports) {
    if (!byEmp.has(r.employeeId)) byEmp.set(r.employeeId, { employee: r.employee, reports: [] })
    byEmp.get(r.employeeId)!.reports.push(r)
  }

  const scored = [...byEmp.values()].map(({ employee, reports: empReports }) => {
    const reviewed = empReports.filter(r => r.status !== "MISSING" && r.status !== "DRAFT")
    const withAtt = reviewed.filter(r => r.attendanceRating !== null)
    const totalScore = reviewed.reduce((s, r) => s + computeScore(r), 0)
    const tlTotal = reviewed.reduce((s, r) => s + (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0), 0)
    const attTotal = withAtt.reduce((s, r) => s + (r.attendanceRating ?? 0), 0)
    const deductions = reviewed.reduce((s, r) => s + (r.pointDeduction ?? 0), 0)
    const streak = computeStreak(reportsByEmp.get(employee.id) ?? new Map(), anchorWeek)
    const count = reviewed.length || 1

    return {
      employeeId: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      dept: employee.department?.name ?? "–",
      totalReports: empReports.length,
      reviewedReports: reviewed.length,
      avgPlScore: Math.round((tlTotal / count) * 10) / 10,
      avgPlPct: Math.round((tlTotal / (count * 9)) * 100),
      avgAttScore: withAtt.length > 0 ? Math.round((attTotal / withAtt.length) * 10) / 10 : null,
      avgAttPct: withAtt.length > 0 ? Math.round((attTotal / (withAtt.length * 3)) * 100) : null,
      totalDeductions: deductions,
      totalScore,
      avgScore: Math.round((totalScore / count) * 10) / 10,
      avgScorePct: Math.round((totalScore / (count * 12)) * 100),
      attendancePending: withAtt.length < reviewed.length,
      streak,
    }
  })

  scored.sort((a, b) => {
    if (a.attendancePending && !b.attendancePending) return 1
    if (!a.attendancePending && b.attendancePending) return -1
    return b.avgScore - a.avgScore
  })
  assignRanks(scored)

  return NextResponse.json({
    leaderboard: scored,
    mode,
    from: rangeStart?.toISOString(),
    to: rangeEnd?.toISOString(),
  })
}
