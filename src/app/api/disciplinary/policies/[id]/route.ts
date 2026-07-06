import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const viewPerm = requirePermission(user, "canViewDisciplinary")
  if (viewPerm) return viewPerm

  const { id } = await params
  const policy = await prisma.disciplinaryPolicy.findUnique({
    where: { id },
    include: {
      violationType: { select: { id: true, name: true } },
      exemptions: {
        include: {
          employee: {
            select: {
              id: true, firstName: true, lastName: true,
              user: { select: { email: true } },
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!policy) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ policy })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManagePolicies")
  if (perm) return perm

  const { id } = await params
  const before = await prisma.disciplinaryPolicy.findUnique({ where: { id } })
  const { name, violationTypeId, systemAction, hasThreshold, violationCount, description, isActive } = await req.json()
  const policy = await prisma.disciplinaryPolicy.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(violationTypeId !== undefined && { violationTypeId: violationTypeId || null }),
      ...(systemAction !== undefined && { systemAction: systemAction || null }),
      ...(hasThreshold !== undefined && { hasThreshold }),
      ...(violationCount !== undefined && { violationCount: violationCount ? Number(violationCount) : null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { violationType: true },
  })

  const diff = before ? diffFields(before as any, policy as any, ["name", "violationTypeId", "systemAction", "hasThreshold", "violationCount", "description", "isActive"] as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "POLICY_EDIT", entity: "DisciplinaryPolicy", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ policy })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManagePolicies")
  if (perm) return perm

  const { id } = await params
  const before = await prisma.disciplinaryPolicy.findUnique({ where: { id }, select: { name: true } })
  await prisma.disciplinaryPolicy.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "POLICY_DELETE", entity: "DisciplinaryPolicy", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
