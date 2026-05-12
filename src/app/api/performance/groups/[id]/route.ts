import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const group = await prisma.performanceGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ group })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, description, memberIds } = await req.json()
  await prisma.performanceGroupMember.deleteMany({ where: { groupId: id } })
  const group = await prisma.performanceGroup.update({
    where: { id },
    data: {
      name: name?.trim(),
      description: description?.trim() || null,
      members: { create: (memberIds ?? []).map((employeeId: string) => ({ employeeId })) },
    },
  })
  return NextResponse.json({ group })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.performanceGroup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
