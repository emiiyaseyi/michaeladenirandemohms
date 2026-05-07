import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

const RECRUITMENT_KEYS = [
  "recruitment_notify_new_application",
  "recruitment_notify_stage_change",
  "recruitment_notify_hired",
  "recruitment_notify_rejected",
  "recruitment_auto_close_days",
  "recruitment_default_employment_type",
  "recruitment_require_cover_letter",
  "recruitment_allow_internal_applications",
]

const DEFAULTS: Record<string, unknown> = {
  recruitment_notify_new_application: true,
  recruitment_notify_stage_change: true,
  recruitment_notify_hired: true,
  recruitment_notify_rejected: false,
  recruitment_auto_close_days: 30,
  recruitment_default_employment_type: "FULL_TIME",
  recruitment_require_cover_letter: false,
  recruitment_allow_internal_applications: true,
}

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewRecruitment) return forbidden("No access")

  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: RECRUITMENT_KEYS } },
  })

  const settings: Record<string, unknown> = { ...DEFAULTS }
  for (const row of rows) settings[row.key] = row.value

  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden("No access")

  const body = await req.json()

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: value as never },
        update: { value: value as never },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
