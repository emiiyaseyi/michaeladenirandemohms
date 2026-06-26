import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

const MEMBER_SELECT = {
  id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
  employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, jobTitle: true, department: { select: { id: true, name: true } } } },
  adminRoles: { include: { adminRole: { select: { id: true, name: true, slug: true, isSystem: true } } }, orderBy: { assignedAt: "asc" as const } },
}

// PATCH /api/settings/admins/[userId] - replace all role assignments
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { userId } = await params
  const { roleIds = [] } = await req.json()

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (target.role === "SUPER_ADMIN") return forbidden("Cannot modify SUPER_ADMIN roles")

  const before = await prisma.userAdminRole.findMany({ where: { userId }, select: { adminRoleId: true } })

  await prisma.$transaction([
    prisma.userAdminRole.deleteMany({ where: { userId } }),
    ...(roleIds.length > 0
      ? [prisma.userAdminRole.createMany({
          data: (roleIds as string[]).map((rid: string) => ({ userId, adminRoleId: rid })),
        })]
      : []),
  ])

  await logAudit({
    req, actor: user,
    action: roleIds.length > 0 ? "ADMIN_ROLE_UPDATE" : "ADMIN_ROLE_REVOKE",
    entity: "User", entityId: userId, targetUserId: userId,
    oldValues: { roleIds: before.map(b => b.adminRoleId) },
    newValues: { roleIds: roleIds as string[] },
  })

  await prisma.notification.create({
    data: {
      userId,
      title: roleIds.length > 0 ? "Admin roles updated" : "Admin access removed",
      message: roleIds.length > 0
        ? "Your admin role assignments have been updated."
        : "Your admin access has been removed. You have been returned to a standard staff account.",
      type: roleIds.length > 0 ? "INFO" : "WARNING",
      link: roleIds.length > 0 ? "/admin" : "/staff",
    },
  })
  sendEmail({ eventKey: roleIds?.length > 0 ? "admin_roles_updated" : "admin_access_removed", toUserId: userId, variables: { employeeName: "" } }).catch(() => {})

  const updated = await prisma.user.findUnique({ where: { id: userId }, select: MEMBER_SELECT })
  return NextResponse.json({ admin: updated })
}

// DELETE /api/settings/admins/[userId] - remove all admin roles (de-elevate)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { userId } = await params

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (target.role === "SUPER_ADMIN") return forbidden("Cannot remove SUPER_ADMIN")

  const before = await prisma.userAdminRole.findMany({ where: { userId }, select: { adminRoleId: true } })
  await prisma.userAdminRole.deleteMany({ where: { userId } })

  await prisma.notification.create({
    data: {
      userId,
      title: "Admin access removed",
      message: "Your admin access has been removed. You have been returned to a standard staff account.",
      type: "WARNING",
      link: "/staff",
    },
  })
  sendEmail({ eventKey: "admin_access_removed", toUserId: userId, variables: { employeeName: "" } }).catch(() => {})

  await logAudit({
    req, actor: user, action: "ADMIN_ROLE_REVOKE", entity: "User", entityId: userId, targetUserId: userId,
    oldValues: { roleIds: before.map(b => b.adminRoleId) },
  })

  return NextResponse.json({ success: true })
}
