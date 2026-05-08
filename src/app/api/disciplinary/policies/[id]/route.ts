import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const policy = await prisma.disciplinaryPolicy.findUnique({
    where: { id },
    include: {
      violationType: { select: { id: true, name: true } },
      exemptions: {
        include: {
          employee: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!policy) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ policy })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, violationTypeId, systemAction, hasThreshold, violationCount, description, isActive } = await req.json()
  const policy = await prisma.disciplinaryPolicy.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(violationTypeId !== undefined && { violationTypeId: violationTypeId || null }),
      ...(systemAction !== undefined && { systemAction: systemAction || null }),
      ...(hasThreshold !== undefined && { hasThreshold }),
      ...(violationCount !== undefined && { violationCount: violationCount ? Number(violationCount) : null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { violationType: true },
  })
  return NextResponse.json({ policy })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.disciplinaryPolicy.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
