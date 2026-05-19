import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

const ROLE_SELECT = {
  id: true, name: true, slug: true, description: true, isSystem: true, permissions: true, createdAt: true, updatedAt: true,
  members: {
    orderBy: { assignedAt: "asc" as const },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, isActive: true,
          employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, jobTitle: true, department: { select: { id: true, name: true } } } },
        },
      },
    },
  },
  _count: { select: { members: true } },
}

// GET /api/settings/roles/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { id } = await params
  const role = await prisma.adminRole.findUnique({ where: { id }, select: ROLE_SELECT })
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 })

  return NextResponse.json({ role })
}

// PATCH /api/settings/roles/[id] — edit name/description/permissions
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { id } = await params
  const existing = await prisma.adminRole.findUnique({ where: { id }, select: { id: true, isSystem: true, slug: true } })
  if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 })

  const body = await req.json()
  const updateData: Record<string, unknown> = {}

  if (body.permissions !== undefined) updateData.permissions = body.permissions
  if (!existing.isSystem) {
    if (body.name?.trim()) {
      const newSlug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      const conflict = await prisma.adminRole.findFirst({ where: { slug: newSlug, id: { not: id } } })
      if (conflict) return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 })
      updateData.name = body.name.trim()
      updateData.slug = newSlug
    }
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
  }

  const beforeFull = await prisma.adminRole.findUnique({ where: { id }, select: { name: true, description: true, permissions: true } })
  const updated = await prisma.adminRole.update({ where: { id }, data: updateData, select: ROLE_SELECT })

  const diff = beforeFull ? diffFields(beforeFull as any, updated as any, ["name", "description", "permissions"] as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "ROLE_EDIT", entity: "AdminRole", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }
  return NextResponse.json({ role: updated })
}

// DELETE /api/settings/roles/[id] — custom roles only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { id } = await params
  const role = await prisma.adminRole.findUnique({ where: { id }, select: { id: true, name: true, slug: true, isSystem: true } })
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 })
  if (role.isSystem) return forbidden("System roles cannot be deleted")

  await prisma.adminRole.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "ROLE_DELETE", entity: "AdminRole", entityId: id,
    oldValues: { name: role.name, slug: role.slug },
  })
  return NextResponse.json({ success: true })
}
