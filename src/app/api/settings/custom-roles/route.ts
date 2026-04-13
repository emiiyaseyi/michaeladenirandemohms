import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

const KEY = "custom_roles"

// Custom role = { id, name, description, duties: string[] }
// duties are granular permission keys (e.g. "canViewPayslips", "canApproveLeave")

export async function GET() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  const roles = setting ? (setting.value as any).roles ?? [] : []
  return NextResponse.json({ customRoles: roles })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { name, description, duties } = await req.json()
  if (!name || !Array.isArray(duties) || duties.length === 0) {
    return NextResponse.json({ error: "Name and at least one permission are required" }, { status: 400 })
  }

  const newRole = {
    id: `custom_${Date.now()}`,
    name: name.trim(),
    description: description?.trim() ?? "",
    duties,
    createdAt: new Date().toISOString(),
  }

  const setting = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  const existing = setting ? (setting.value as any).roles ?? [] : []
  const updated = [...existing, newRole]

  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: { roles: updated } },
    create: { key: KEY, value: { roles: updated } },
  })

  return NextResponse.json({ customRole: newRole }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  const setting = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  if (!setting) return NextResponse.json({ ok: true })

  const existing = (setting.value as any).roles ?? []
  const updated = existing.filter((r: any) => r.id !== id)

  await prisma.systemSetting.update({
    where: { key: KEY },
    data: { value: { roles: updated } },
  })

  return NextResponse.json({ ok: true })
}
