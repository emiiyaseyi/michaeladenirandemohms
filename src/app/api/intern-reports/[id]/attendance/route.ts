import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { format } from "date-fns"

function computeScore(r: any): number {
  const tl = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
  const att = r.attendanceRating ?? 0
  return Math.max(0, tl + att - (r.pointDeduction ?? 0))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  // Only admin (SUPER_ADMIN or canFillAttendance permission) can fill attendance
  const canFill = user.role === "SUPER_ADMIN" || !!user.permissions["canFillAttendance"]
  if (!canFill) return forbidden("Only admins can fill attendance ratings")

  const { id } = await params
  const report = await prisma.internWeeklyReport.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, userId: true, firstName: true, lastName: true } },
    },
  })
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  // No time restriction — admin can fill attendance any time after report is submitted or for MISSING records
  const allowedStatuses = ["SUBMITTED", "LATE", "REVIEWED", "MISSING"]
  if (!allowedStatuses.includes(report.status)) {
    return NextResponse.json({ error: "Attendance can only be filled on submitted, reviewed, or missing-record reports" }, { status: 400 })
  }

  const { attendanceRating, attendanceComment } = await req.json()

  if (attendanceRating !== undefined && (attendanceRating < 0 || attendanceRating > 3 || !Number.isInteger(attendanceRating))) {
    return NextResponse.json({ error: "attendanceRating must be an integer between 0 and 3" }, { status: 400 })
  }

  const updated = await prisma.internWeeklyReport.update({
    where: { id },
    data: {
      attendanceRating: attendanceRating ?? undefined,
      attendanceComment: attendanceComment ?? undefined,
      attendanceFilledAt: new Date(),
      attendanceFilledById: user.employeeId,
    },
  })

  const totalScore = computeScore(updated)
  const pct = Math.round((totalScore / 12) * 100)
  const weekRange = `${format(report.weekStart, "MMM d")} – ${format(report.weekEnd, "MMM d, yyyy")}`

  // Notify the intern immediately
  if (report.employee.userId) {
    await prisma.notification.create({
      data: {
        userId: report.employee.userId,
        title: "Attendance Recorded for Your Weekly Report",
        message: `Your attendance for ${weekRange} has been recorded. Your total score for this week is ${pct}%.`,
        type: "SUCCESS",
        link: "/staff/intern-report",
      },
    }).catch(() => {})
  }

  return NextResponse.json({ report: { ...updated, totalScore } })
}
