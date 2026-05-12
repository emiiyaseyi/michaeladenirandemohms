import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

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

