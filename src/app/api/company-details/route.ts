import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

const KEY = "company_details"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const setting = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  if (setting) return NextResponse.json({ details: setting.value })

  // Fall back to branding orgName for the company name
  const branding = await prisma.systemSetting.findUnique({ where: { key: "branding" } })
  const brandingData = branding?.value as any
  return NextResponse.json({
    details: {
      companyName: brandingData?.orgName ?? "Data Science Nigeria",
      email: "",
      primaryContact: "",
      otherContact: "",
      logoUrl: brandingData?.logoUrl ?? null,
    },
  })
}

export async function PUT(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { email, primaryContact, otherContact, logoUrl } = await req.json()

  // Preserve the existing company name — it is read-only
  const existing = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  const existingData = (existing?.value ?? {}) as any
  const branding = await prisma.systemSetting.findUnique({ where: { key: "branding" } })
  const brandingData = (branding?.value ?? {}) as any
  const companyName = existingData.companyName ?? brandingData?.orgName ?? "Data Science Nigeria"

  const value = {
    companyName,
    email: email ?? "",
    primaryContact: primaryContact ?? "",
    otherContact: otherContact ?? "",
    logoUrl: logoUrl ?? null,
  }

  const setting = await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value },
    create: { key: KEY, value },
  })

  return NextResponse.json({ details: setting.value })
}
