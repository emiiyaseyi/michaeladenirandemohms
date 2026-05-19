import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"
import { EMAIL_EVENTS } from "@/lib/email-events"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const [settings, templates] = await Promise.all([
    prisma.emailSettings.findUnique({ where: { id: "singleton" } }),
    prisma.emailTemplate.findMany({ orderBy: { eventKey: "asc" } }),
  ])

  return NextResponse.json({
    settings: settings ?? { id: "singleton", enabled: false, fromName: "DSN HRMS", fromEmail: "noreply@hrms.dsnsandbox.com", eventToggles: {} },
    templates,
    eventDefs: EMAIL_EVENTS,
  })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const body = await req.json()
  const { enabled, fromName, fromEmail, eventToggles } = body

  const data: any = { updatedAt: new Date() }
  if (enabled !== undefined) data.enabled = enabled
  if (fromName !== undefined) data.fromName = fromName
  if (fromEmail !== undefined) data.fromEmail = fromEmail
  if (eventToggles !== undefined) data.eventToggles = eventToggles

  const before = await prisma.emailSettings.findUnique({ where: { id: "singleton" } })

  const settings = await prisma.emailSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: {
      id: "singleton",
      enabled: enabled ?? false,
      fromName: fromName ?? "DSN HRMS",
      fromEmail: fromEmail ?? "noreply@hrms.dsnsandbox.com",
      eventToggles: eventToggles ?? {},
    },
  })

  const diff = before ? diffFields(before as any, settings as any, ["enabled", "fromName", "fromEmail", "eventToggles"] as any) : null
  if (diff || !before) {
    await logAudit({
      req, actor: user, action: "EMAIL_SETTINGS_UPDATE", entity: "EmailSettings", entityId: "singleton",
      oldValues: diff?.old, newValues: diff?.new ?? data,
    })
  }

  return NextResponse.json({ settings })
}
