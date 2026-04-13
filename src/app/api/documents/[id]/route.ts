import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = ["SUPER_ADMIN","ADMIN","HR_ADMIN"].includes(user.role)
  if (!isAdmin) return forbidden()

  const { id } = await params
  const body = await req.json()
  const { title, category, description, canView, canDownload, requiresAck, canCopy } = body

  const doc = await prisma.orgDocument.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(canView !== undefined && { canView }),
      ...(canDownload !== undefined && { canDownload }),
      ...(requiresAck !== undefined && { requiresAck }),
      ...(canCopy !== undefined && { canCopy }),
    },
    include: { uploadedBy: { select: { name: true } } },
  })

  return NextResponse.json({ doc })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = ["SUPER_ADMIN","ADMIN","HR_ADMIN"].includes(user.role)
  if (!isAdmin) return forbidden()

  const { id } = await params
  // Soft delete
  await prisma.orgDocument.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
