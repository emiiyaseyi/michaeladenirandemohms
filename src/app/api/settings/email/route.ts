import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
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

  return NextResponse.json({ settings })
}
