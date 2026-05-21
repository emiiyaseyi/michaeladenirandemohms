import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { format } from "date-fns"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const canReview = user.role === "PROJECT_LEAD" || user.role === "STAFF" || !!user.permissions["canReviewInternReports"]
  if (!canReview) return forbidden("Only assigned reviewers can fill feedback on reports")

  const { id } = await params
  const report = await prisma.internWeeklyReport.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, projectLeadId: true, userId: true, firstName: true, lastName: true } },
      reviewers: { select: { id: true, reviewerEmployeeId: true, isPrimary: true, reviewedAt: true } },
    },
  })
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  // Find this caller's reviewer record
  const myReviewerRecord = report.reviewers.find(rv => rv.reviewerEmployeeId === user.employeeId)

  // If the report has reviewer records, caller must be in the list
  if (report.reviewers.length > 0 && !myReviewerRecord) {
    // Allow admins with explicit permission to still review (they aren't in the list)
    if (!user.permissions["canReviewInternReports"]) {
      return forbidden("You are not a reviewer for this report")
    }
  }

  // PLs without explicit permission can only review their own interns
  if (user.role === "PROJECT_LEAD" && !user.permissions["canReviewInternReports"]) {
    if (report.employee.projectLeadId !== user.employeeId && !myReviewerRecord) {
      return forbidden("You can only review reports for your interns or reports you were assigned to")
    }
  }

  const body = await req.json()
  const { productivityRating, ldRating, reflectionsRating, tlComment, comment } = body

  // Validate ratings (only required when primary reviewer submits ratings)
  const isPrimary =
    (myReviewerRecord?.isPrimary === true) ||
    (report.employee.projectLeadId === user.employeeId)
  if (isPrimary) {
    for (const [key, val] of [["productivityRating", productivityRating], ["ldRating", ldRating], ["reflectionsRating", reflectionsRating]] as [string, number][]) {
      if (val !== undefined && (val < 0 || val > 3 || !Number.isInteger(val))) {
        return NextResponse.json({ error: `${key} must be an integer between 0 and 3` }, { status: 400 })
      }
    }
  }

  // Update the reviewer record if it exists
  if (myReviewerRecord) {
    await prisma.internReportReviewer.update({
      where: { id: myReviewerRecord.id },
      data: {
        comment: comment ?? tlComment ?? undefined,
        reviewedAt: new Date(),
      },
    })
  }

  await logAudit({
    req, actor: user, action: "INTERN_REPORT_REVIEW", entity: "InternWeeklyReport", entityId: id,
    targetUserId: report.employee.userId,
    newValues: { isPrimary, productivityRating, ldRating, reflectionsRating },
    reason: tlComment ?? comment ?? null,
  })

  // If primary: also update the main report fields
  let updated: any
  if (isPrimary) {
    updated = await prisma.internWeeklyReport.update({
      where: { id },
      data: {
        productivityRating: productivityRating ?? undefined,
        ldRating: ldRating ?? undefined,
        reflectionsRating: reflectionsRating ?? undefined,
        tlComment: tlComment ?? comment ?? undefined,
        tlReviewedAt: new Date(),
        tlReviewerId: user.employeeId,
      },
    })
  } else {
    updated = await prisma.internWeeklyReport.findUnique({ where: { id } })
  }

  // Check if ALL reviewers have now reviewed
  const allReviewers = await prisma.internReportReviewer.findMany({ where: { reportId: id } })
  const allDone = allReviewers.length > 0 && allReviewers.every(rv => rv.reviewedAt !== null)

  if (allDone && report.status !== "REVIEWED") {
    await prisma.internWeeklyReport.update({ where: { id }, data: { status: "REVIEWED" } })

    // Notify the intern
    if (report.employee.userId) {
      const totalScore = (updated.productivityRating ?? 0) + (updated.ldRating ?? 0) + (updated.reflectionsRating ?? 0)
      await prisma.notification.create({
        data: {
          userId: report.employee.userId,
          title: "Your Weekly Report Has Been Reviewed",
          message: `Your report for the week of ${format(report.weekStart, "MMM d")} – ${format(report.weekEnd, "MMM d, yyyy")} has been reviewed by all reviewers. TL score: ${Math.max(0, totalScore)} / 9.`,
          type: "SUCCESS",
          link: "/staff/intern-report",
        },
      }).catch(() => {})

      // intern_report_reviewed email dropped (R6) — intern sees REVIEWED status next
      // time they open /staff/intern-report. In-app notification suffices.
    }

    // Notify admins with canFillAttendance
    const attendanceAdmins = await prisma.user.findMany({
      where: {
        adminRoles: {
          some: {
            adminRole: {
              permissions: { path: ["canFillAttendance"], equals: true },
            },
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
          title: "Intern Report Ready for Attendance",
          message: `${report.employee.firstName} ${report.employee.lastName}'s report for ${format(report.weekEnd, "MMM d, yyyy")} has been fully reviewed. Please fill in the attendance rating.`,
          type: "INFO",
          link: "/admin/reports/intern-reports",
        },
      }).catch(() => {})
    }
  } else if (!allDone && report.status !== "REVIEWED") {
    // Partial review — notify intern as well if primary just reviewed
    if (isPrimary && report.employee.userId) {
      const totalScore = (updated.productivityRating ?? 0) + (updated.ldRating ?? 0) + (updated.reflectionsRating ?? 0)
      await prisma.notification.create({
        data: {
          userId: report.employee.userId,
          title: "Your Weekly Report Has TL Feedback",
          message: `Your report for the week of ${format(report.weekStart, "MMM d")} – ${format(report.weekEnd, "MMM d, yyyy")} has received Team Lead feedback. Score so far: ${Math.max(0, totalScore)} / 9.`,
          type: "SUCCESS",
          link: "/staff/intern-report",
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ report: updated })
}
