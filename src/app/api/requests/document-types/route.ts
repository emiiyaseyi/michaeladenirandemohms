import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const types = await prisma.requestDocumentType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json({ types })
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { name } = await req.json()
  const trimmed = String(name ?? "").trim()
  if (!trimmed) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  if (trimmed.length > 80) return NextResponse.json({ error: "Name must be 80 characters or fewer" }, { status: 400 })

  const existing = await prisma.requestDocumentType.findUnique({ where: { name: trimmed } })
  if (existing) {
    if (!existing.isActive) {
      const reactivated = await prisma.requestDocumentType.update({
        where: { id: existing.id },
        data: { isActive: true },
      })
      return NextResponse.json({ type: reactivated })
    }
    return NextResponse.json({ type: existing })
  }

  const type = await prisma.requestDocumentType.create({ data: { name: trimmed } })
  return NextResponse.json({ type })
}
