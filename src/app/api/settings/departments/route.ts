import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()
  const { name, description, divisionId } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const dept = await prisma.department.create({ data: { name, description: description||null, divisionId: divisionId||null } })
  return NextResponse.json({ dept }, { status: 201 })
}
