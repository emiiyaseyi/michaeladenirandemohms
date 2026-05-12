import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
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
