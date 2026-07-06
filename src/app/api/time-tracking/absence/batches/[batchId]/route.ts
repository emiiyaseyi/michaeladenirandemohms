import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(_: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const viewPerm = requirePermission(user, "canViewAbsences")
  if (viewPerm) return viewPerm

  const { batchId } = await params
  const batch = await prisma.absenceBatch.findUnique({ where: { id: batchId } })
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ batch })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canDeleteAbsence")
  if (perm) return perm

  const { batchId } = await params
  await prisma.absenceBatch.delete({ where: { id: batchId } })
  return NextResponse.json({ ok: true })
}
