import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

const DEFAULTS = {
  submissionDay: 5,
  openHour: 16,
  lateHour: 20,
  closeHour: 24,
  lateDeduction: 2,
}

const DEFAULT_CRITERIA = [
  { score: 3, description: "Present all 3 required days with NO lateness" },
  { score: 2, description: "Present 3 days, late but with Admin/HR notification" },
  { score: 1, description: "Present 2 days out of 3, with lateness and no notification" },
  { score: 0, description: "Absent and/or late all week with no notification" },
]

export async function GET() {
  const cfg = await prisma.internReportSettings.findUnique({ where: { id: "singleton" } })
  return NextResponse.json({
    ...(cfg ?? DEFAULTS),
    attendanceCriteria: cfg?.attendanceCriteria ?? DEFAULT_CRITERIA,
  })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions?.canViewInternReports) return forbidden()

  const body = await req.json()
  const { submissionDay, openHour, lateHour, closeHour, lateDeduction, attendanceCriteria } = body

  const settings = await prisma.internReportSettings.upsert({
    where: { id: "singleton" },
    update: {
      ...(submissionDay !== undefined && { submissionDay: Number(submissionDay) }),
      ...(openHour !== undefined && { openHour: Number(openHour) }),
      ...(lateHour !== undefined && { lateHour: Number(lateHour) }),
      ...(closeHour !== undefined && { closeHour: Number(closeHour) }),
      ...(lateDeduction !== undefined && { lateDeduction: Number(lateDeduction) }),
      ...(attendanceCriteria !== undefined && { attendanceCriteria }),
    },
    create: {
      id: "singleton",
      submissionDay: Number(submissionDay ?? DEFAULTS.submissionDay),
      openHour: Number(openHour ?? DEFAULTS.openHour),
      lateHour: Number(lateHour ?? DEFAULTS.lateHour),
      closeHour: Number(closeHour ?? DEFAULTS.closeHour),
      lateDeduction: Number(lateDeduction ?? DEFAULTS.lateDeduction),
      attendanceCriteria: attendanceCriteria ?? DEFAULT_CRITERIA,
    },
  })

  return NextResponse.json({
    ...settings,
    attendanceCriteria: settings.attendanceCriteria ?? DEFAULT_CRITERIA,
  })
}
