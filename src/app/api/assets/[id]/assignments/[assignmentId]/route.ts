import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const permError = requirePermission(user, "canManageAssetAssignments")
  if (permError) return permError

  const { assignmentId } = await params
  const { action } = await req.json()

  if (action === "release") {
    const assignment = await prisma.assetAssignment.update({
      where: { id: assignmentId },
      data: { status: "RELEASED", releasedAt: new Date() },
    })
    return NextResponse.json({ assignment })
  }

  if (action === "remove") {
    await prisma.assetAssignment.delete({ where: { id: assignmentId } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
