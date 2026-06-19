import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, hasCap, forbidden } from "@/lib/api-auth"

export async function GET(_: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAbsences")) return forbidden()

  const { batchId } = await params
  const batch = await prisma.absenceBatch.findUnique({ where: { id: batchId } })
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ batch })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canDeleteAbsence")) return forbidden()

  const { batchId } = await params
  await prisma.absenceBatch.delete({ where: { id: batchId } })
  return NextResponse.json({ ok: true })
}
