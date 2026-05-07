import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const doc = await prisma.orgDocument.update({ where: { id }, data: { title: title.trim() } })
  return NextResponse.json({ doc })
}
