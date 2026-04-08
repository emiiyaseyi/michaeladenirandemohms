import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

// PATCH /api/settings/users/[id] — update role, status, or reset password
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden("Super Admin only")

  const { id } = params
  const body = await req.json()
  const { role, isActive, newPassword } = body

  // Prevent super admin from deactivating themselves
  if (id === user.id && isActive === false) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 })
  }

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

  return NextResponse.json({ user: updated })
}

// DELETE /api/settings/users/[id] — hard delete (only for users with no employee activity)
// Prefer deactivation via PATCH isActive=false
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden("Super Admin only")

  const { id } = params

  if (id === user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
