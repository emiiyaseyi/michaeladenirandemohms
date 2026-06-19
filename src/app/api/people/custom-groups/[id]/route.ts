import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAllEmployees")) return forbidden()

  const { id } = await params
  const group = await prisma.customGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, profilePhoto: true, jobTitle: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ group })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageCustomGroups")) return forbidden()

  const { id } = await params
  const { name, description, groupByCurrency, status, memberIds } = await req.json()

  const group = await prisma.customGroup.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(groupByCurrency !== undefined && { groupByCurrency }),
      ...(status !== undefined && { status }),
      ...(memberIds !== undefined && {
        members: {
          deleteMany: {},
          create: (memberIds as string[]).map(employeeId => ({ employeeId })),
        },
      }),
    },
    include: { _count: { select: { members: true } } },
  })

  return NextResponse.json({ group })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageCustomGroups")) return forbidden()

  const { id } = await params
  await prisma.customGroup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
