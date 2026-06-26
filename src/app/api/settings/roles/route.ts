import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

// GET /api/settings/roles - all AdminRoles with member count
export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const roles = await prisma.adminRole.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { members: true } },
    },
  })

  return NextResponse.json({ roles })
}

// POST /api/settings/roles - create custom role
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { name, description, permissions = {} } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

  const existing = await prisma.adminRole.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 })

  const role = await prisma.adminRole.create({
    data: { name: name.trim(), slug, description: description?.trim() || null, isSystem: false, permissions },
    include: { _count: { select: { members: true } } },
  })

  await logAudit({
    req, actor: user, action: "ROLE_CREATE", entity: "AdminRole", entityId: role.id,
    newValues: { name: role.name, slug: role.slug, permissions },
  })

  return NextResponse.json({ role }, { status: 201 })
}
