import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params
  const batch = await prisma.absenceBatch.findUnique({ where: { id: batchId } })
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ batch })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params
  await prisma.absenceBatch.delete({ where: { id: batchId } })
  return NextResponse.json({ ok: true })
}
