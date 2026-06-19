import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

// Admin-only: create a MISSING placeholder for an intern who has no report for a given week.
// This lets admins fill attendance for interns who never submitted.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const canAdmin = user.role === "SUPER_ADMIN" || !!user.permissions?.canFillAttendance
  if (!canAdmin) return forbidden("Only admins can create report placeholders")

  const { employeeId, weekStart: weekStartRaw } = await req.json()
  if (!employeeId || !weekStartRaw) {
    return NextResponse.json({ error: "employeeId and weekStart are required" }, { status: 400 })
  }

  const ws = new Date(weekStartRaw)
  ws.setUTCHours(0, 0, 0, 0)
  const we = new Date(ws)
  we.setUTCDate(ws.getUTCDate() + 4)

  const existing = await prisma.internWeeklyReport.findFirst({
    where: { employeeId, weekStart: ws },
  })
  if (existing) {
    return NextResponse.json({ report: existing })
  }

  const cfg = await prisma.internReportSettings.findUnique({ where: { id: "singleton" } })
  const deduction = cfg?.lateDeductionSunday ?? 3

  const report = await prisma.internWeeklyReport.create({
    data: {
      employeeId,
      weekStart: ws,
      weekEnd: we,
      status: "MISSING",
      pointDeduction: deduction,
      lateFlag: false,
      submittedAt: null,
    },
  })

  return NextResponse.json({ report }, { status: 201 })
}
