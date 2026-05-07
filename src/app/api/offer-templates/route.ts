import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const templates = await prisma.offerTemplate.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true, isDefault: true, createdAt: true },
  })
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { name, content, isDefault } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const template = await prisma.offerTemplate.create({
    data: { name: name.trim(), content: content ?? null, isDefault: isDefault ?? false, status: "DRAFT", createdById: user.id },
  })
  return NextResponse.json({ template }, { status: 201 })
}
