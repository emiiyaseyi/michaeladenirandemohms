import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const workplaces = await (prisma as any).workplace.findMany({ orderBy: { createdAt: "asc" } })
  return NextResponse.json({ workplaces })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const body = await req.json()
  const { displayName, addressLine1, addressLine2, city, state, country, zipCode, phone, taxOffice, taxId, nhfLocation } = body

  if (!displayName?.trim()) return NextResponse.json({ error: "Display name is required" }, { status: 400 })
  if (!addressLine1?.trim()) return NextResponse.json({ error: "Address line 1 is required" }, { status: 400 })
  if (!phone?.trim()) return NextResponse.json({ error: "Phone is required" }, { status: 400 })
  if (!country?.trim()) return NextResponse.json({ error: "Country is required" }, { status: 400 })
  if (!state?.trim()) return NextResponse.json({ error: "State is required" }, { status: 400 })

  const existing = await (prisma as any).workplace.count()
  const isFirst = existing === 0

  const workplace = await (prisma as any).workplace.create({
    data: {
      displayName: displayName.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || "Nigeria",
      zipCode: zipCode?.trim() || null,
      phone: phone.trim(),
      taxOffice: taxOffice?.trim() || null,
      taxId: taxId?.trim() || null,
      nhfLocation: nhfLocation?.trim() || null,
      isFiling: isFirst,
      isMailing: isFirst,
      isActive: true,
    },
  })

  return NextResponse.json({ workplace })
}
