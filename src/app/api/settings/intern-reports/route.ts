import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

const DEFAULTS = {
  submissionDay: 5,
  openHour: 16, openMinute: 0,
  lateHour: 20, lateMinute: 0,
  closeHour: 24,
  lateDeduction: 2,
  lateDeductionSunday: 3,
  missingWeeklyDeduction: 10,
  warningThresholdMinutes: 15,
  reviewerDeadlineDay: 7,
  reviewerDeadlineHour: 8,
  reviewerDeadlineMinute: 0,
}

const DEFAULT_CRITERIA = [
  { score: 3, description: "Present all 3 required days with NO lateness" },
  { score: 2, description: "Present 3 days, late but with Admin/HR notification" },
  { score: 1, description: "Present 2 days out of 3, with lateness and no notification" },
  { score: 0, description: "Absent and/or late all week with no notification" },
]

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  const cfg = await prisma.internReportSettings.findUnique({ where: { id: "singleton" } })
  return NextResponse.json({
    ...(cfg ?? DEFAULTS),
    closeHour: DEFAULTS.closeHour,
    attendanceCriteria: cfg?.attendanceCriteria ?? DEFAULT_CRITERIA,
  })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions?.canViewInternReports) return forbidden()

  const body = await req.json()
  const {
    submissionDay, openHour, openMinute, lateHour, lateMinute,
    lateDeduction, lateDeductionSunday, missingWeeklyDeduction, warningThresholdMinutes,
    reviewerDeadlineDay, reviewerDeadlineHour, reviewerDeadlineMinute,
    attendanceCriteria,
  } = body

  const n = (v: any, def: number) => v !== undefined ? Number(v) : def

  const settings = await prisma.internReportSettings.upsert({
    where: { id: "singleton" },
    update: {
      closeHour: DEFAULTS.closeHour,
      ...(submissionDay !== undefined && { submissionDay: Number(submissionDay) }),
      ...(openHour !== undefined && { openHour: Number(openHour) }),
      ...(openMinute !== undefined && { openMinute: Number(openMinute) }),
      ...(lateHour !== undefined && { lateHour: Number(lateHour) }),
      ...(lateMinute !== undefined && { lateMinute: Number(lateMinute) }),
      ...(lateDeduction !== undefined && { lateDeduction: Number(lateDeduction) }),
      ...(lateDeductionSunday !== undefined && { lateDeductionSunday: Number(lateDeductionSunday) }),
      ...(missingWeeklyDeduction !== undefined && { missingWeeklyDeduction: Number(missingWeeklyDeduction) }),
      ...(warningThresholdMinutes !== undefined && { warningThresholdMinutes: Number(warningThresholdMinutes) }),
      ...(reviewerDeadlineDay !== undefined && { reviewerDeadlineDay: Number(reviewerDeadlineDay) }),
      ...(reviewerDeadlineHour !== undefined && { reviewerDeadlineHour: Number(reviewerDeadlineHour) }),
      ...(reviewerDeadlineMinute !== undefined && { reviewerDeadlineMinute: Number(reviewerDeadlineMinute) }),
      ...(attendanceCriteria !== undefined && { attendanceCriteria }),
    },
    create: {
      id: "singleton",
      submissionDay: n(submissionDay, DEFAULTS.submissionDay),
      openHour: n(openHour, DEFAULTS.openHour),
      openMinute: n(openMinute, DEFAULTS.openMinute),
      lateHour: n(lateHour, DEFAULTS.lateHour),
      lateMinute: n(lateMinute, DEFAULTS.lateMinute),
      closeHour: DEFAULTS.closeHour,
      lateDeduction: n(lateDeduction, DEFAULTS.lateDeduction),
      lateDeductionSunday: n(lateDeductionSunday, DEFAULTS.lateDeductionSunday),
      missingWeeklyDeduction: n(missingWeeklyDeduction, DEFAULTS.missingWeeklyDeduction),
      warningThresholdMinutes: n(warningThresholdMinutes, DEFAULTS.warningThresholdMinutes),
      reviewerDeadlineDay: n(reviewerDeadlineDay, DEFAULTS.reviewerDeadlineDay),
      reviewerDeadlineHour: n(reviewerDeadlineHour, DEFAULTS.reviewerDeadlineHour),
      reviewerDeadlineMinute: n(reviewerDeadlineMinute, DEFAULTS.reviewerDeadlineMinute),
      attendanceCriteria: attendanceCriteria ?? DEFAULT_CRITERIA,
    },
  })

  return NextResponse.json({
    ...settings,
    attendanceCriteria: settings.attendanceCriteria ?? DEFAULT_CRITERIA,
  })
}
