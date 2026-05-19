import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const permError = requirePermission(user, "canManageAssetAssignments")
  if (permError) return permError

  const { id: assetId, assignmentId } = await params
  const { action } = await req.json()

  const before = await prisma.assetAssignment.findUnique({
    where: { id: assignmentId },
    include: { employee: { select: { userId: true } } },
  })

  if (action === "release") {
    const assignment = await prisma.assetAssignment.update({
      where: { id: assignmentId },
      data: { status: "RELEASED", releasedAt: new Date() },
    })
    await logAudit({
      req, actor: user, action: "ASSET_RELEASE", entity: "Asset", entityId: assetId,
      targetUserId: before?.employee?.userId ?? null,
      oldValues: { status: before?.status }, newValues: { status: "RELEASED" },
    })
    return NextResponse.json({ assignment })
  }

  if (action === "remove") {
    await prisma.assetAssignment.delete({ where: { id: assignmentId } })
    await logAudit({
      req, actor: user, action: "ASSET_UNASSIGN", entity: "Asset", entityId: assetId,
      targetUserId: before?.employee?.userId ?? null,
      oldValues: { assignmentId, employeeId: before?.employeeId },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
