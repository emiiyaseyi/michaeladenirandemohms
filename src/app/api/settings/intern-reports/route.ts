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

export async function GET() {
  const settings = await prisma.internReportSettings.findUnique({ where: { id: "singleton" } })
  return NextResponse.json(settings ?? DEFAULTS)
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions?.canViewInternReports) return forbidden()

  const body = await req.json()
  const { submissionDay, openHour, lateHour, closeHour, lateDeduction } = body

  const settings = await prisma.internReportSettings.upsert({
    where: { id: "singleton" },
    update: {
      ...(submissionDay !== undefined && { submissionDay: Number(submissionDay) }),
      ...(openHour !== undefined && { openHour: Number(openHour) }),
      ...(lateHour !== undefined && { lateHour: Number(lateHour) }),
      ...(closeHour !== undefined && { closeHour: Number(closeHour) }),
      ...(lateDeduction !== undefined && { lateDeduction: Number(lateDeduction) }),
    },
    create: {
      id: "singleton",
      submissionDay: Number(submissionDay ?? DEFAULTS.submissionDay),
      openHour: Number(openHour ?? DEFAULTS.openHour),
      lateHour: Number(lateHour ?? DEFAULTS.lateHour),
      closeHour: Number(closeHour ?? DEFAULTS.closeHour),
      lateDeduction: Number(lateDeduction ?? DEFAULTS.lateDeduction),
    },
  })

  return NextResponse.json(settings)
}
