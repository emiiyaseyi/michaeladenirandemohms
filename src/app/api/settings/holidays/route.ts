import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()))
  const holidays = await (prisma as any).publicHoliday.findMany({
    where: { year },
    orderBy: { date: "asc" },
  })
  return NextResponse.json({ holidays })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const denied = requirePermission(user, "canManageSettings")
  if (denied) return denied
  const { name, date } = await req.json()
  if (!name || !date) return NextResponse.json({ error: "Name and date required" }, { status: 400 })
  const d = new Date(date)
  const h = await (prisma as any).publicHoliday.create({ data: { name, date: d, year: d.getFullYear(), isCustom: true } })
  await logAudit({ req, actor: user, action: "HOLIDAY_CREATE", entity: "PublicHoliday", entityId: h.id, newValues: { name, date: d } })
  return NextResponse.json({ h }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const denied = requirePermission(user, "canManageSettings")
  if (denied) return denied
  const { id, name, date } = await req.json()
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  const existing = await (prisma as any).publicHoliday.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!existing.isCustom) return NextResponse.json({ error: "Cannot edit system holidays" }, { status: 403 })

  const d = new Date(date)
  const h = await (prisma as any).publicHoliday.update({
    where: { id },
    data: { name, date: d, year: d.getFullYear() },
  })
  await logAudit({
    req, actor: user, action: "HOLIDAY_EDIT", entity: "PublicHoliday", entityId: id,
    oldValues: { name: existing.name, date: existing.date },
    newValues: { name, date: d },
  })
  return NextResponse.json({ h })
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const denied = requirePermission(user, "canManageSettings")
  if (denied) return denied
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  const existing = await (prisma as any).publicHoliday.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!existing.isCustom) return NextResponse.json({ error: "Cannot delete system holidays" }, { status: 403 })

  await (prisma as any).publicHoliday.delete({ where: { id } })
  await logAudit({
    req, actor: user, action: "HOLIDAY_DELETE", entity: "PublicHoliday", entityId: id,
    oldValues: { name: existing.name, date: existing.date },
  })
  return NextResponse.json({ ok: true })
}
