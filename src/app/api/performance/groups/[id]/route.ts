import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

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
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const before = await prisma.performanceGroup.findUnique({ where: { id } })
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

  const diff = before ? diffFields(before as any, group as any, ["name", "description"] as any) : null
  if (diff || memberIds !== undefined) {
    await logAudit({
      req, actor: user, action: "PERFORMANCE_GROUP_EDIT", entity: "PerformanceGroup", entityId: id,
      oldValues: diff?.old, newValues: { ...(diff?.new ?? {}), memberIds: memberIds ?? [] },
    })
  }
  return NextResponse.json({ group })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const before = await prisma.performanceGroup.findUnique({ where: { id }, select: { name: true } })
  await prisma.performanceGroup.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "PERFORMANCE_GROUP_DELETE", entity: "PerformanceGroup", entityId: id,
    oldValues: before ?? undefined,
  })
  return NextResponse.json({ ok: true })
}
