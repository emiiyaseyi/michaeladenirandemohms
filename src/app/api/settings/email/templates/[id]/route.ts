import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { id } = await params
  const { name, subject, body, variables, isActive } = await req.json()

  const template = await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(subject !== undefined && { subject }),
      ...(body !== undefined && { body }),
      ...(variables !== undefined && { variables }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ template })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { id } = await params
  await prisma.emailTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
