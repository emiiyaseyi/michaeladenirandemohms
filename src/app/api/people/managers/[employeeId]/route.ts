import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden("Only super admin can remove managers")

  const { employeeId } = await params
  const manager = await prisma.manager.findUnique({ where: { employeeId } })
  if (!manager) return NextResponse.json({ error: "Not a manager" }, { status: 404 })
  if (manager.isSystem) return NextResponse.json({ error: "Cannot remove a system-protected manager" }, { status: 400 })

  await prisma.manager.delete({ where: { id: manager.id } })

  const empUser = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } })
  await logAudit({
    req, actor: user, action: "MANAGER_UNASSIGN", entity: "Manager", entityId: manager.id,
    targetUserId: empUser?.userId ?? null,
    oldValues: { employeeId },
  })

  return NextResponse.json({ ok: true })
}
