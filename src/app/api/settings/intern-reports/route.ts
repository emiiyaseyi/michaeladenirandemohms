import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

const DEFAULTS = {
  submissionDay: 5,
  openHour: 16,
  lateHour: 20,
  closeHour: 24,
  lateDeduction: 2,
  lateDeductionSunday: 3,
  warningThresholdMinutes: 15,
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
    // These two are locked policy — always return the canonical values regardless of DB state
    submissionDay: DEFAULTS.submissionDay,
    closeHour: DEFAULTS.closeHour,
    attendanceCriteria: cfg?.attendanceCriteria ?? DEFAULT_CRITERIA,
  })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions?.canViewInternReports) return forbidden()

  const body = await req.json()
  // submissionDay (Friday) and closeHour (Sunday midnight) are locked policy — silently ignore any attempt to change.
  const { openHour, lateHour, lateDeduction, lateDeductionSunday, warningThresholdMinutes, attendanceCriteria } = body

  const settings = await prisma.internReportSettings.upsert({
    where: { id: "singleton" },
    update: {
      submissionDay: DEFAULTS.submissionDay, // normalize any stale DB value back to Friday
      closeHour: DEFAULTS.closeHour,         // normalize any stale DB value back to midnight
      ...(openHour !== undefined && { openHour: Number(openHour) }),
      ...(lateHour !== undefined && { lateHour: Number(lateHour) }),
      ...(lateDeduction !== undefined && { lateDeduction: Number(lateDeduction) }),
      ...(lateDeductionSunday !== undefined && { lateDeductionSunday: Number(lateDeductionSunday) }),
      ...(warningThresholdMinutes !== undefined && { warningThresholdMinutes: Number(warningThresholdMinutes) }),
      ...(attendanceCriteria !== undefined && { attendanceCriteria }),
    },
    create: {
      id: "singleton",
      submissionDay: DEFAULTS.submissionDay,   // locked to Friday
      openHour: Number(openHour ?? DEFAULTS.openHour),
      lateHour: Number(lateHour ?? DEFAULTS.lateHour),
      closeHour: DEFAULTS.closeHour,           // locked to midnight (window stays open Sat+Sun)
      lateDeduction: Number(lateDeduction ?? DEFAULTS.lateDeduction),
      lateDeductionSunday: Number(lateDeductionSunday ?? DEFAULTS.lateDeductionSunday),
      warningThresholdMinutes: Number(warningThresholdMinutes ?? DEFAULTS.warningThresholdMinutes),
      attendanceCriteria: attendanceCriteria ?? DEFAULT_CRITERIA,
    },
  })

  return NextResponse.json({
    ...settings,
    attendanceCriteria: settings.attendanceCriteria ?? DEFAULT_CRITERIA,
  })
}
