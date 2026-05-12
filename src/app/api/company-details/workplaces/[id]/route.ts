import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const body = await req.json()
  const { displayName, addressLine1, addressLine2, city, state, country, zipCode, phone, email, isActive } = body

  if (!displayName?.trim()) return NextResponse.json({ error: "Display name is required" }, { status: 400 })
  if (!addressLine1?.trim()) return NextResponse.json({ error: "Address line 1 is required" }, { status: 400 })
  if (!phone?.trim()) return NextResponse.json({ error: "Phone is required" }, { status: 400 })
  if (!country?.trim()) return NextResponse.json({ error: "Country is required" }, { status: 400 })
  if (!state?.trim()) return NextResponse.json({ error: "State is required" }, { status: 400 })

  const existing = await (prisma as any).workplace.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updateData: any = {
    displayName: displayName.trim(),
    addressLine1: addressLine1.trim(),
    addressLine2: addressLine2?.trim() || null,
    city: city?.trim() || null,
    state: state?.trim() || null,
    country: country?.trim() || "Nigeria",
    zipCode: zipCode?.trim() || null,
    phone: phone.trim(),
    email: email?.trim() || null,
  }
  if (typeof isActive === "boolean") updateData.isActive = isActive

  const workplace = await (prisma as any).workplace.update({ where: { id }, data: updateData })
  return NextResponse.json({ workplace })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const existing = await (prisma as any).workplace.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.isFiling || existing.isMailing) {
    return NextResponse.json({ error: "Cannot delete a workplace that is the filing or mailing address. Switch to another first." }, { status: 400 })
  }

  await (prisma as any).workplace.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
