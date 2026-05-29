import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

function computeScore(r: any): number {
  const tl = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
  const att = r.attendanceRating ?? 0
  return Math.max(0, tl + att - (r.pointDeduction ?? 0))
}

function getWeekBoundsLocal(date: Date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d); monday.setDate(d.getDate() + diffToMonday)
  return monday
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const url = req.nextUrl
  const weekParam = url.searchParams.get("week")

  // Default to current week
  const weekStart = weekParam
    ? getWeekBoundsLocal(new Date(weekParam))
    : getWeekBoundsLocal(new Date())

  // Fetch all intern reports for this week
  const reports = await prisma.internWeeklyReport.findMany({
    where: {
      weekStart,
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

  const scored = reports.map(r => {
    const totalScore = computeScore(r)
    const tlScore = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
    return {
      reportId: r.id,
      employeeId: r.employeeId,
      name: `${r.employee.firstName} ${r.employee.lastName}`,
      dept: r.employee.department?.name ?? "–",
      status: r.status,
      totalHours: r.totalHours,
      tlScore,
      tlScorePct: Math.round((tlScore / 9) * 100),
      attendanceRating: r.attendanceRating,
      attendanceScorePct: r.attendanceRating !== null ? Math.round((r.attendanceRating / 3) * 100) : null,
      pointDeduction: r.pointDeduction,
      totalScore,
      totalScorePct: Math.round((totalScore / 12) * 100),
      attendancePending: r.attendanceRating === null,
    }
  })

  // Sort: highest total score first. Attendance-pending ones go at bottom of their tier.
  scored.sort((a, b) => {
    if (a.attendancePending && !b.attendancePending) return 1
    if (!a.attendancePending && b.attendancePending) return -1
    return b.totalScore - a.totalScore
  })

  // Assign ranks (ties share rank)
  let rank = 1
  for (let i = 0; i < scored.length; i++) {
    if (i > 0 && scored[i].totalScore < scored[i - 1].totalScore && !scored[i].attendancePending) {
      rank = i + 1
    }
    ;(scored[i] as any).rank = scored[i].attendancePending ? null : rank
  }

  return NextResponse.json({ leaderboard: scored, weekStart: weekStart.toISOString() })
}
