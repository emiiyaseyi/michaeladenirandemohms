import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const { firstName, lastName, email, phone } = await req.json()

  const admin = await prisma.user.update({
    where: { id },
    data: {
      ...(firstName || lastName ? { name: `${firstName ?? ""} ${lastName ?? ""}`.trim() } : {}),
      ...(email ? { email } : {}),
      ...(phone !== undefined && { employee: { update: { phone: phone || null } } }),
    },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true, employee: { select: { id: true, phone: true, profilePhoto: true } } },
  })

  return NextResponse.json({ admin })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params

  if (user.id === id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })

  await prisma.$transaction(async tx => {
    // Delete records with required FK pointing to this user
    await tx.announcement.deleteMany({ where: { createdById: id } })
    await tx.orgDocument.deleteMany({ where: { uploadedById: id } })
    await tx.auditLog.deleteMany({ where: { userId: id } })
    await tx.notification.deleteMany({ where: { userId: id } })
    // Nullify optional FK references
    await tx.profileUpdateRequest.updateMany({ where: { reviewedBy: id }, data: { reviewedBy: null } })
    await tx.personalDocument.updateMany({ where: { reviewedBy: id }, data: { reviewedBy: null } })
    await tx.passwordResetRequest.updateMany({ where: { userId: id }, data: { userId: null } })
    await tx.passwordResetRequest.updateMany({ where: { resolvedBy: id }, data: { resolvedBy: null } })
    // Delete auth records then user
    await tx.session.deleteMany({ where: { userId: id } })
    await tx.account.deleteMany({ where: { userId: id } })
    await tx.user.delete({ where: { id } })
  })

  return NextResponse.json({ ok: true })
}
