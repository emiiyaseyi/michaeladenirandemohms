import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewDisciplinary")
  if (perm) return perm

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""

  const types = await prisma.violationType.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ types })
}

export async function POST(req: NextRequest) {
  const { user: u2, error: e2 } = await requireAuth()
  if (e2) return e2
  const p2 = requirePermission(u2, "canManageViolationTypes")
  if (p2) return p2

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  const existing = await prisma.violationType.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } })
  if (existing) return NextResponse.json({ error: "A violation type with this name already exists" }, { status: 409 })
  const type = await prisma.violationType.create({ data: { name: name.trim() } })

  await logAudit({
    req, actor: u2, action: "VIOLATION_TYPE_CREATE", entity: "ViolationType", entityId: type.id,
    newValues: { name: type.name },
  })

  return NextResponse.json({ type }, { status: 201 })
}
