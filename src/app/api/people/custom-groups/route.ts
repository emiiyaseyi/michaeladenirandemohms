import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, hasCap, forbidden, requirePermission } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAllEmployees")) return forbidden()

  const groups = await prisma.customGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  })

  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageCustomGroups")
  if (perm) return perm

  const { name, description, groupByCurrency, memberIds } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const group = await prisma.customGroup.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      groupByCurrency: groupByCurrency ?? false,
      members: memberIds?.length ? { create: (memberIds as string[]).map(employeeId => ({ employeeId })) } : undefined,
    },
    include: { _count: { select: { members: true } } },
  })

  return NextResponse.json({ group }, { status: 201 })
}
