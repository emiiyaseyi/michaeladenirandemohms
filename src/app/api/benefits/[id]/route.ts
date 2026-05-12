import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const benefit = await prisma.benefit.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, department: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!benefit) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ benefit })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewBenefits")
  if (perm) return perm

  const { id } = await params
  const body = await req.json()

  const benefit = await prisma.benefit.update({
    where: { id },
    data: {
      name: body.name?.trim(),
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      category: body.category,
      status: body.status,
      enrollType: body.enrollType,
    },
  })

  return NextResponse.json({ benefit })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewBenefits")
  if (perm) return perm

  const { id } = await params
  await prisma.benefit.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
