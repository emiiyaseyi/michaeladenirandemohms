import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

// POST /api/settings/roles/[id]/members — assign users { userIds: string[] }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { id } = await params
  const { userIds = [] } = await req.json()
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "userIds array is required" }, { status: 400 })
  }

  const role = await prisma.adminRole.findUnique({ where: { id }, select: { id: true } })
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 })

  await prisma.userAdminRole.createMany({
    data: (userIds as string[]).map((uid: string) => ({ userId: uid, adminRoleId: id })),
    skipDuplicates: true,
  })

  for (const uid of userIds as string[]) {
    await logAudit({
      req, actor: user, action: "ROLE_MEMBER_ADD", entity: "AdminRole", entityId: id,
      targetUserId: uid,
      newValues: { roleId: id, userId: uid },
    })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/settings/roles/[id]/members — remove a single member { userId: string }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { id } = await params
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 })

  await prisma.userAdminRole.deleteMany({ where: { userId, adminRoleId: id } })

  await logAudit({
    req, actor: user, action: "ROLE_MEMBER_REMOVE", entity: "AdminRole", entityId: id,
    targetUserId: userId,
    oldValues: { roleId: id, userId },
  })
  return NextResponse.json({ success: true })
}
