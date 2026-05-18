import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { name, description, defaultDays, minNoticeDays, genderSpecific, requiresDoc, minDocDays, internOnly, deductFromAnnual } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const lt = await prisma.leaveType.create({
    data: {
      name,
      description: description || null,
      defaultDays: Number(defaultDays ?? 10),
      minNoticeDays: Number(minNoticeDays ?? 10),
      genderSpecific: genderSpecific || null,
      requiresDoc: requiresDoc ?? false,
      minDocDays: Number(minDocDays ?? 2),
      internOnly: !!internOnly,
      deductFromAnnual: !!deductFromAnnual,
    },
  })
  return NextResponse.json({ lt }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { id, name, description, defaultDays, minNoticeDays, genderSpecific, requiresDoc, minDocDays, internOnly, deductFromAnnual, isActive } = await req.json()
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  const lt = await prisma.leaveType.update({
    where: { id },
    data: {
      name,
      description: description || null,
      defaultDays: Number(defaultDays ?? 10),
      minNoticeDays: Number(minNoticeDays ?? 10),
      genderSpecific: genderSpecific || null,
      requiresDoc: requiresDoc ?? false,
      minDocDays: Number(minDocDays ?? 2),
      internOnly: !!internOnly,
      deductFromAnnual: !!deductFromAnnual,
      isActive: isActive ?? true,
    },
  })
  return NextResponse.json({ lt })
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  const count = await prisma.leaveRequest.count({ where: { leaveTypeId: id } })
  if (count > 0) return NextResponse.json({ error: `Cannot delete — ${count} leave request(s) use this type` }, { status: 409 })
  await prisma.leaveType.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
