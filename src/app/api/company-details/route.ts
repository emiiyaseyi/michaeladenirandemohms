import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { getBranding } from "@/lib/branding"

const KEY = "company_details"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const setting = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  if (setting) return NextResponse.json({ details: setting.value })

  // Fall back to branding settings for the company name/logo
  const branding = await getBranding()
  return NextResponse.json({
    details: {
      companyName: branding.companyName,
      email: "",
      primaryContact: "",
      otherContact: "",
      logoUrl: branding.logoUrl,
    },
  })
}

