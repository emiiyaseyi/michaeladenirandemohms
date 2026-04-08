import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { name, date } = await req.json()
  if (!name || !date) return NextResponse.json({ error: "Name and date required" }, { status: 400 })
  const d = new Date(date)
  const h = await prisma.publicHoliday.create({ data: { name, date: d, year: d.getFullYear() } })
  return NextResponse.json({ h }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { id, name, date } = await req.json()
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  const d = new Date(date)
  const h = await prisma.publicHoliday.update({
    where: { id },
    data: { name, date: d, year: d.getFullYear() },
  })
  return NextResponse.json({ h })
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  await prisma.publicHoliday.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
