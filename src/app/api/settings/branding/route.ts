import { NextRequest, NextResponse } from "next/server"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"
import { getBranding, saveBranding } from "@/lib/branding"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const branding = await getBranding()
  return NextResponse.json({ branding })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const body = await req.json()
  const patch: Record<string, unknown> = {}

  if (body.companyName !== undefined) {
    const name = String(body.companyName).trim()
    if (!name) return NextResponse.json({ error: "Company name is required" }, { status: 400 })
    patch.companyName = name
  }
  if (body.primaryColor !== undefined) {
    const color = String(body.primaryColor).trim()
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return NextResponse.json({ error: "Primary color must be a 6-digit hex code, e.g. #0B5C2E" }, { status: 400 })
    patch.primaryColor = color
  }
  if (body.employeeEmailDomain !== undefined) {
    patch.employeeEmailDomain = String(body.employeeEmailDomain).trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\//, "")
  }
  if (body.logoUrl !== undefined) {
    patch.logoUrl = body.logoUrl ? String(body.logoUrl) : null
  }

  const before = await getBranding()
  const branding = await saveBranding(patch)

  const diff = diffFields(before as any, branding as any, ["companyName", "primaryColor", "employeeEmailDomain", "logoUrl"] as any)
  if (diff) {
    await logAudit({
      req, actor: user, action: "BRANDING_UPDATE", entity: "SystemSetting", entityId: "branding",
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ branding })
}
