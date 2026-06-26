import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

function computeScore(r: any): number {
  const tl = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
  return Math.max(0, tl + (r.attendanceRating ?? 0) - (r.pointDeduction ?? 0))
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const report = await prisma.internWeeklyReport.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true, projectLeadId: true, department: { select: { name: true } } } },
      plReviewer: { select: { id: true, firstName: true, lastName: true } },
      attendanceFiller: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  // Access control
  const isOwn = report.employeeId === user.employeeId
  const isAdmin = user.role === "SUPER_ADMIN" || !!user.permissions["canViewInternReports"]
  const isPL = user.role === "PROJECT_LEAD" &&
    (report.employee.projectLeadId === user.employeeId || !!user.permissions["canReviewInternReports"])

  if (!isOwn && !isAdmin && !isPL) return forbidden()

  // Drafts are personal - block everyone but the owning intern, even if they'd
  // otherwise qualify as admin/PL for this report once it's actually submitted.
  if (report.status === "DRAFT" && !isOwn) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  return NextResponse.json({ report: { ...report, totalScore: computeScore(report) } })
}

// DELETE - admin clears a MISSING placeholder so the intern can submit retroactively.
// Only MISSING rows can be deleted via this endpoint; regular submissions are protected.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const canClear = user.role === "SUPER_ADMIN" || !!user.permissions["canViewInternReports"]
  if (!canClear) return forbidden("You do not have permission to clear missing intern reports")

  const { id } = await params
  const report = await prisma.internWeeklyReport.findUnique({
    where: { id },
    include: { employee: { select: { userId: true, firstName: true, lastName: true } } },
  })
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })
  if (report.status !== "MISSING") {
    return NextResponse.json({ error: "Only missing-report placeholders can be deleted." }, { status: 400 })
  }

  await prisma.internWeeklyReport.delete({ where: { id } })

  await logAudit({
    req, actor: user,
    action: "INTERN_REPORT_MISSING_CLEAR",
    entity: "InternWeeklyReport", entityId: id,
    targetUserId: report.employee?.userId ?? null,
    oldValues: { status: report.status, pointDeduction: report.pointDeduction, weekStart: report.weekStart },
  })

  // Notify the intern that they can now submit retroactively
  if (report.employee?.userId) {
    await prisma.notification.create({
      data: {
        userId: report.employee.userId,
        employeeId: report.employeeId,
        title: "Missing report cleared",
        message: `An admin has cleared your missed-report record. You can now submit retroactively for that week.`,
        type: "INFO",
        link: "/staff/intern-report",
      },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
