import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

const KEY = "branding"

const DEFAULT_BRANDING = {
  orgName: "DataSphere Nigeria",
  font: "Inter",
  primaryColor: "#0052A5",
  logoUrl: null,
  wallpaperUrl: null,
}

export async function GET() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  return NextResponse.json({ branding: setting ? (setting.value as any) : DEFAULT_BRANDING })
}

export async function PUT(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const body = await req.json()
  const { orgName, font, primaryColor, logoUrl, wallpaperUrl } = body

  const value = { orgName, font, primaryColor, logoUrl: logoUrl ?? null, wallpaperUrl: wallpaperUrl ?? null }

  const setting = await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value },
    create: { key: KEY, value },
  })

  return NextResponse.json({ branding: setting.value })
}
