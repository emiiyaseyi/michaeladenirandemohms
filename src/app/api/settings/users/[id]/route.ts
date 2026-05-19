import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, isAdminRole } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

// PATCH /api/settings/users/[id] — update role, status, or reset password
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminRole(user.role)) return forbidden("Admins only")

  const { id } = await params
  const body = await req.json()
  const { role, isActive, newPassword } = body

  // Prevent super admin from deactivating themselves
  if (id === user.id && isActive === false) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 })
  }

  const before = await prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } })

  const updates: Record<string, any> = {}
  if (role !== undefined) updates.role = role
  if (isActive !== undefined) updates.isActive = isActive
  if (newPassword) updates.password = await bcrypt.hash(newPassword, 12)

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          jobTitle: true,
          employeeStatus: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  })

  const diff = before ? diffFields(before as any, updated as any, ["role", "isActive"] as any) : null
  if (diff || newPassword) {
    await logAudit({
      req, actor: user, action: "USER_EDIT", entity: "User", entityId: id, targetUserId: id,
      oldValues: diff?.old,
      newValues: { ...(diff?.new ?? {}), ...(newPassword ? { passwordReset: true } : {}) },
    })
  }

  return NextResponse.json({ user: updated })
}

// DELETE /api/settings/users/[id] — hard delete (only for users with no employee activity)
// Prefer deactivation via PATCH isActive=false
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminRole(user.role)) return forbidden("Admins only")

  const { id } = await params

  if (id === user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  const before = await prisma.user.findUnique({ where: { id }, select: { email: true, name: true, role: true } })
  await prisma.user.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "USER_DELETE", entity: "User", entityId: id, targetUserId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
