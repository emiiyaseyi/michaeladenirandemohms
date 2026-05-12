import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; actionId: string }> }) {
  const { actionId } = await params
  try {
    await prisma.conversationAction.delete({ where: { id: actionId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete action" }, { status: 500 })
  }
}
