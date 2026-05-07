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

  const { companyName, email, primaryContact, otherContact, logoUrl } = await req.json()

  const value = {
    companyName: companyName ?? "",
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

  // Keep branding orgName in sync
  const branding = await prisma.systemSetting.findUnique({ where: { key: "branding" } })
  const existing = (branding?.value ?? {}) as any
  await prisma.systemSetting.upsert({
    where: { key: "branding" },
    update: { value: { ...existing, orgName: companyName } },
    create: { key: "branding", value: { orgName: companyName, font: "Inter", primaryColor: "#0052A5", logoUrl: null, wallpaperUrl: null } },
  })

  return NextResponse.json({ details: setting.value })
}
