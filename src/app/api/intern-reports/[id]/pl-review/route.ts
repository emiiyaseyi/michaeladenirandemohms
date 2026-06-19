import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { sendEmail } from "@/lib/email"
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
      reviewers: true,
    },
  })
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  const myReviewerRecord = report.reviewers.find(rv => rv.reviewerEmployeeId === user.employeeId)

  if (report.reviewers.length > 0 && !myReviewerRecord) {
    if (!user.permissions["canReviewInternReports"]) {
      return forbidden("You are not a reviewer for this report")
    }
  }

  if (user.role === "PROJECT_LEAD" && !user.permissions["canReviewInternReports"]) {
    if (report.employee.projectLeadId !== user.employeeId && !myReviewerRecord) {
      return forbidden("You can only review reports for your interns or reports you were assigned to")
    }
  }

  const body = await req.json()
  const { productivityRating, ldRating, reflectionsRating, plComment, comment } = body

  for (const [key, val] of [["productivityRating", productivityRating], ["ldRating", ldRating], ["reflectionsRating", reflectionsRating]] as [string, number][]) {
    if (val !== undefined && (val < 0 || val > 3 || !Number.isInteger(val))) {
      return NextResponse.json({ error: `${key} must be an integer between 0 and 3` }, { status: 400 })
    }
  }

  // Save ratings to the reviewer's own InternReportReviewer record
  if (myReviewerRecord) {
    await prisma.internReportReviewer.update({
      where: { id: myReviewerRecord.id },
      data: {
        productivityRating: productivityRating ?? undefined,
        ldRating: ldRating ?? undefined,
        reflectionsRating: reflectionsRating ?? undefined,
        comment: comment ?? plComment ?? undefined,
        reviewedAt: new Date(),
      },
    })
  }

  // Recompute averaged TL scores from ALL reviewers who have submitted ratings
  const allReviewers = await prisma.internReportReviewer.findMany({ where: { reportId: id } })
  const ratedReviewers = allReviewers.filter(rv => rv.reviewedAt !== null && rv.productivityRating !== null)

  let avgProductivity: number | null = null
  let avgLd: number | null = null
  let avgReflections: number | null = null

  if (ratedReviewers.length > 0) {
    avgProductivity = Math.round(ratedReviewers.reduce((s, rv) => s + (rv.productivityRating ?? 0), 0) / ratedReviewers.length)
    avgLd = Math.round(ratedReviewers.reduce((s, rv) => s + (rv.ldRating ?? 0), 0) / ratedReviewers.length)
    avgReflections = Math.round(ratedReviewers.reduce((s, rv) => s + (rv.reflectionsRating ?? 0), 0) / ratedReviewers.length)
  }

  const isPrimary = (myReviewerRecord?.isPrimary === true) || (report.employee.projectLeadId === user.employeeId)

  const allDone = allReviewers.length > 0 && allReviewers.every(rv => rv.reviewedAt !== null)

  // Update the main report with averaged scores + REVIEWED status if all done
  const updated = await prisma.internWeeklyReport.update({
    where: { id },
    data: {
      productivityRating: avgProductivity ?? undefined,
      ldRating: avgLd ?? undefined,
      reflectionsRating: avgReflections ?? undefined,
      plComment: isPrimary ? (plComment ?? comment ?? undefined) : undefined,
      plReviewedAt: isPrimary ? new Date() : undefined,
      plReviewerId: isPrimary ? user.employeeId : undefined,
      status: allDone && report.status !== "REVIEWED" ? "REVIEWED" : undefined,
    },
  })

  await logAudit({
    req, actor: user, action: "INTERN_REPORT_REVIEW", entity: "InternWeeklyReport", entityId: id,
    targetUserId: report.employee.userId,
    newValues: { productivityRating, ldRating, reflectionsRating, avgProductivity, avgLd, avgReflections },
    reason: plComment ?? comment ?? null,
  })

  const internName = `${report.employee.firstName} ${report.employee.lastName}`
  const weekRange = `${format(report.weekStart, "MMM d")} – ${format(report.weekEnd, "MMM d, yyyy")}`
  const plScore = (avgProductivity ?? 0) + (avgLd ?? 0) + (avgReflections ?? 0)
  const pct = Math.round((plScore / 9) * 100)

  // Notify intern that a reviewer has submitted feedback
  if (report.employee.userId) {
    const msg = allDone
      ? `Your report for ${weekRange} has been reviewed by all reviewers. PL score so far: ${pct}%.`
      : `Your report for ${weekRange} has received feedback from a reviewer. Current PL score: ${pct}%.`
    await prisma.notification.create({
      data: {
        userId: report.employee.userId,
        title: allDone ? "Your Weekly Report Has Been Fully Reviewed" : "New Feedback on Your Weekly Report",
        message: msg,
        type: "SUCCESS",
        link: "/staff/intern-report",
      },
    }).catch(() => {})
  }

  if (allDone) {
    // Notify admins with canFillAttendance permission
    const attendanceAdmins = await prisma.user.findMany({
      where: {
        adminRoles: {
          some: { adminRole: { permissions: { path: ["canFillAttendance"], equals: true } } },
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
          message: `${internName}'s report for ${weekRange} has been fully reviewed. Please fill in the attendance rating.`,
          type: "INFO",
          link: "/admin/reports/intern-reports",
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ report: updated })
}
