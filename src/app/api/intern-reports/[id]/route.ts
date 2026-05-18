import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

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
      tlReviewer: { select: { id: true, firstName: true, lastName: true } },
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

  return NextResponse.json({ report: { ...report, totalScore: computeScore(report) } })
}
