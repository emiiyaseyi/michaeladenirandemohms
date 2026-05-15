import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageGroups")
  if (perm) return perm

  const groups = await prisma.performanceGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  })
  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const { user: u2, error: e2 } = await requireAuth()
  if (e2) return e2
  const p2 = requirePermission(u2, "canManageGroups")
  if (p2) return p2

  const { name, description, memberIds } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const group = await prisma.performanceGroup.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      members: { create: (memberIds ?? []).map((employeeId: string) => ({ employeeId })) },
    },
  })
  return NextResponse.json({ group }, { status: 201 })
}
