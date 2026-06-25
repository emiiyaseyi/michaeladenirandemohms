import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { format, subDays, startOfDay } from "date-fns"

// Saturday/Sunday late deductions and the Monday missing-report deduction are always
// calendar-fixed — they never move even if "Submission Day" (window-open day) is reconfigured.
// Flat per-week deduction: -missingWeeklyDeduction on every Monday the report stays unsubmitted (no streak/escalation).
function missedMondaysCount(weekStart: Date, now: Date): number {
  const firstMissedMonday = new Date(weekStart)
  firstMissedMonday.setDate(weekStart.getDate() + 7)
  if (now.getTime() < firstMissedMonday.getTime()) return 0
  return Math.floor((now.getTime() - firstMissedMonday.getTime()) / (7 * 86400000)) + 1
}

// Runs Monday 07:00 UTC (08:00 WAT) via vercel.json cron.
// For every active intern who has NO InternWeeklyReport row for the just-finished work week
// (Mon-Fri immediately prior), create a MISSING placeholder with a flat weekly deduction and notify the PL.
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
  const missingWeeklyDeduction = cfg?.missingWeeklyDeduction ?? 10
  const closingDay = "Sunday"

  // Reviewer deadline is fixed: 7 days after the week starts, at 08:00 WAT — the exact
  // moment this cron runs. Not configurable (the cron only runs once a week).
  const reviewerDeadline = new Date(weekStart)
  reviewerDeadline.setDate(reviewerDeadline.getDate() + 7)
  reviewerDeadline.setUTCHours(8 - 1, 0, 0, 0) // WAT = UTC+1
  const reviewerDeadlinePassed = now >= reviewerDeadline

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
      createdAt: true,
      internReportStartDate: true,
    },
  })

  let createdCount = 0
  for (const intern of interns) {
    // Eligibility starts from account creation, not hireDate — unless an admin set an
    // explicit override (internReportStartDate) for this intern.
    // Only skip if an explicit internReportStartDate is set and the week predates it.
    // Falling back to createdAt is wrong — interns are often data-entered after they started.
    if (intern.internReportStartDate && weekStart < intern.internReportStartDate) continue

    // Only skip if a real submission exists — DRAFT does not count as submitted
    const existing = await prisma.internWeeklyReport.findFirst({
      where: { employeeId: intern.id, weekStart, status: { notIn: ["DRAFT"] } },
    })
    if (existing) continue // SUBMITTED / LATE / REVIEWED / MISSING already handled

    const missingDeduction = missedMondaysCount(weekStart, now) * missingWeeklyDeduction

    // If intern saved a draft but never submitted, overwrite it with MISSING
    const draft = await prisma.internWeeklyReport.findFirst({
      where: { employeeId: intern.id, weekStart, status: "DRAFT" },
    })
    let placeholder: { id: string }
    if (draft) {
      placeholder = await prisma.internWeeklyReport.update({
        where: { id: draft.id },
        data: { status: "MISSING", pointDeduction: missingDeduction, lateFlag: true, submittedAt: null },
      })
    } else {
      placeholder = await prisma.internWeeklyReport.create({
        data: {
          employeeId: intern.id,
          weekStart,
          weekEnd,
          status: "MISSING",
          pointDeduction: missingDeduction,
          lateFlag: true,
          submittedAt: null,
        },
      })
    }
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
        reason: `Auto-created by Monday cron — intern did not submit by ${closingDay} 11:59 PM WAT.`,
      },
    }).catch(err => console.error("[audit] MISSING placeholder audit failed:", err))

    if (intern.userId) {
      await prisma.notification.create({
        data: {
          userId: intern.userId,
          employeeId: intern.id,
          title: "Missed Weekly Report",
          message: `You have not submitted a weekly report for ${weekRange}. Your report is still open — deductions increase each day you delay. Submit as soon as possible.`,
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
        isActive: true,
        OR: [
          { role: "SUPER_ADMIN" },
          {
            adminRoles: {
              some: {
                adminRole: { permissions: { path: ["canFillAttendance"], equals: true } },
              },
            },
          },
        ],
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

  // Recompute the flat weekly deduction for every still-outstanding MISSING report (any week),
  // so an intern who stays unsubmitted for multiple weeks accrues -missingWeeklyDeduction per Monday.
  const outstandingMissing = await prisma.internWeeklyReport.findMany({
    where: { status: "MISSING" },
    select: { id: true, weekStart: true, pointDeduction: true },
  })
  for (const report of outstandingMissing) {
    const freshDeduction = missedMondaysCount(report.weekStart, now) * missingWeeklyDeduction
    if (freshDeduction !== report.pointDeduction) {
      await prisma.internWeeklyReport.update({
        where: { id: report.id },
        data: { pointDeduction: freshDeduction },
      })
    }
  }

  // Notify admins and individual reviewers about reports with outstanding TL reviews
  const reportsWithPendingReviews = await prisma.internWeeklyReport.findMany({
    where: {
      weekStart,
      status: { in: ["SUBMITTED", "LATE"] },
      reviewers: { some: { reviewedAt: null } },
    },
    select: {
      id: true,
      employee: { select: { firstName: true, lastName: true } },
      reviewers: {
        where: { reviewedAt: null },
        select: {
          reviewer: {
            select: {
              userId: true,
              user: { select: { role: true } },
            },
          },
        },
      },
    },
  })

  const weekRange = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`

  if (reportsWithPendingReviews.length > 0) {
    const digestAdmins = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: "SUPER_ADMIN" },
          {
            adminRoles: {
              some: { adminRole: { permissions: { path: ["canFillAttendance"], equals: true } } },
            },
          },
        ],
      },
      select: { id: true },
    })

    const count = reportsWithPendingReviews.length
    for (const admin of digestAdmins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Pending PL Reviews",
          message: `${count} intern report${count > 1 ? "s" : ""} for ${weekRange} still have outstanding Project Lead reviews.`,
          type: "WARNING",
          link: "/admin/reports/intern-reports",
        },
      }).catch(() => {})
    }
  }

  // Only notify individual reviewers once the fixed reviewer deadline has passed
  for (const report of reviewerDeadlinePassed ? reportsWithPendingReviews : []) {
    const internName = `${report.employee.firstName} ${report.employee.lastName}`
    for (const rv of report.reviewers) {
      const uid = rv.reviewer?.userId
      if (!uid) continue
      const role = (rv.reviewer as any).user?.role ?? "PROJECT_LEAD"
      const link = role === "STAFF" ? "/staff/intern-reviews"
                 : role === "PROJECT_LEAD" ? "/project-lead/intern-reports"
                 : "/admin/reports/intern-reports"
      await prisma.notification.create({
        data: {
          userId: uid,
          title: "Review Overdue",
          message: `Your review of ${internName}'s report for ${weekRange} is past the deadline. Please complete it as soon as possible.`,
          type: "DANGER",
          link,
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({
    created: createdCount,
    totalInterns: interns.length,
    pendingReviews: reportsWithPendingReviews.length,
    weekRange: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
  })
}
