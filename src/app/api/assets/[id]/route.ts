import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      assetType: { select: { id: true, name: true } },
      assignments: {
        orderBy: { createdAt: "asc" },
        include: {
          employee: {
            select: {
              id: true, firstName: true, lastName: true,
              jobTitle: true,
              department: { select: { name: true } },
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  })
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ asset })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const { name, assetTypeId, description, identifier, commissionDate, isMultiAssignable, maxAssignees, isActive } = body

  const before = await prisma.asset.findUnique({ where: { id } })
  const asset = await prisma.asset.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(assetTypeId !== undefined && { assetTypeId: assetTypeId || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(identifier !== undefined && { identifier: identifier?.trim() || null }),
      ...(commissionDate !== undefined && { commissionDate: commissionDate ? new Date(commissionDate) : null }),
      ...(isMultiAssignable !== undefined && { isMultiAssignable }),
      ...(maxAssignees !== undefined && { maxAssignees: maxAssignees ? parseInt(maxAssignees) : null }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  const diff = before ? diffFields(before as any, asset as any, ["name", "assetTypeId", "description", "identifier", "commissionDate", "isMultiAssignable", "maxAssignees", "isActive"] as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "ASSET_EDIT", entity: "Asset", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ asset })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const before = await prisma.asset.findUnique({ where: { id }, select: { name: true, identifier: true } })
  await prisma.asset.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "ASSET_DELETE", entity: "Asset", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
