import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, isAdminRole } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

// PATCH /api/auth/forgot-password/[id] - admin resolves a reset request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminRole(user.role)) return forbidden()

  const { id } = await params
  const { newPassword, action } = await req.json()

  const request = await prisma.passwordResetRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 })
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Already resolved" }, { status: 409 })
  }

  if (action === "reject") {
    await prisma.passwordResetRequest.update({
      where: { id },
      data: { status: "REJECTED", resolvedBy: user.id, resolvedAt: new Date() },
    })

    await logAudit({
      req, actor: user, action: "PASSWORD_RESET_REJECT", entity: "PasswordResetRequest", entityId: id,
      targetUserId: request.userId ?? null,
      newValues: { email: request.email, status: "REJECTED" },
    })

    return NextResponse.json({ success: true })
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { email: request.email },
      data: { password: hashed, mustChangePassword: true },
    }),
    prisma.passwordResetRequest.update({
      where: { id },
      data: { status: "RESOLVED", resolvedBy: user.id, resolvedAt: new Date() },
    }),
  ])

  await logAudit({
    req, actor: user, action: "PASSWORD_RESET_RESOLVE", entity: "PasswordResetRequest", entityId: id,
    targetUserId: request.userId ?? null,
    newValues: { email: request.email, status: "RESOLVED" },
  })

  return NextResponse.json({ success: true })
}
