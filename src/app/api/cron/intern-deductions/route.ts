import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { format, subDays, startOfDay } from "date-fns"

// Runs Monday 07:00 UTC (08:00 WAT) via vercel.json cron.
// For every active intern who has NO InternWeeklyReport row for the just-finished work week
// (Mon-Fri immediately prior), create a MISSING placeholder with pointDeduction (default 3) and notify the PL.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  // Cron runs Monday → "last Monday" is 7 days ago.
  // weekStart matches the convention used by getWeekBounds in /api/intern-reports.
  const weekStart = startOfDay(subDays(now, 7))
  const weekEnd   = startOfDay(subDays(now, 3)) // Friday of the same week

  const cfg = await prisma.internReportSettings.findUnique({ where: { id: "singleton" } })
  const missingDeduction = cfg?.lateDeductionSunday ?? 3

  const interns = await prisma.employee.findMany({
    where: {
      employeeStatus: "ACTIVE",
      jobTitle: { contains: "intern", mode: "insensitive" },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      projectLeadId: true,
      userId: true,
    },
  })

  let createdCount = 0
  for (const intern of interns) {
    const existing = await prisma.internWeeklyReport.findFirst({
      where: { employeeId: intern.id, weekStart },
    })
    if (existing) continue // submitted (or already MISSING from a prior run)

    const placeholder = await prisma.internWeeklyReport.create({
      data: {
        employeeId: intern.id,
        weekStart,
        weekEnd,
        status: "MISSING",
        pointDeduction: missingDeduction,
        lateFlag: false,
        submittedAt: null,
      },
    })
    createdCount++

    const internName = `${intern.firstName} ${intern.lastName}`
    const weekRange = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`

    await prisma.auditLog.create({
      data: {
        userId: null,
        targetUserId: intern.userId,
        action: "INTERN_REPORT_MISSING_AUTO",
        entity: "InternWeeklyReport",
        entityId: placeholder.id,
        newValues: { weekStart, weekEnd, status: "MISSING", pointDeduction: missingDeduction },
        reason: "Auto-created by Monday cron — intern did not submit by Sunday 11:59 PM WAT.",
      },
    }).catch(err => console.error("[audit] MISSING placeholder audit failed:", err))

    if (intern.userId) {
      await prisma.notification.create({
        data: {
          userId: intern.userId,
          employeeId: intern.id,
          title: "Missed Weekly Report",
          message: `You did not submit a weekly report for ${weekRange}. ${missingDeduction} points have been deducted. Speak with HR if there was a valid reason.`,
          type: "DANGER",
          link: "/staff/intern-report",
        },
      }).catch(() => {})
    }

    if (intern.projectLeadId) {
      const pl = await prisma.employee.findUnique({
        where: { id: intern.projectLeadId },
        select: { userId: true },
      })
      if (pl?.userId) {
        await prisma.notification.create({
          data: {
            userId: pl.userId,
            employeeId: intern.projectLeadId,
            title: "Intern Missed Weekly Report",
            message: `${internName} did not submit a report for ${weekRange}. A MISSING placeholder was auto-created with a ${missingDeduction}-point deduction.`,
            type: "WARNING",
            link: "/project-lead/intern-reports",
          },
        }).catch(() => {})
        sendEmail({
          eventKey: "intern_report_missing",
          toUserId: pl.userId,
          variables: {
            internName,
            weekRange,
            reviewLink: `${process.env.NEXTAUTH_URL ?? ""}/project-lead/intern-reports`,
          },
        }).catch(() => {})
      }
    }

    const attendanceAdmins = await prisma.user.findMany({
      where: {
        adminRoles: {
          some: {
            adminRole: { permissions: { path: ["canFillAttendance"], equals: true } },
          },
        },
        isActive: true,
      },
      select: { id: true },
    })
    for (const admin of attendanceAdmins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Intern Missed Weekly Report",
          message: `${internName} did not submit for ${weekRange}.`,
          type: "WARNING",
          link: "/admin/reports/intern-reports",
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({
    created: createdCount,
    totalInterns: interns.length,
    weekRange: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
  })
}
