import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { noteId } = await params
  try {
    const { content } = await req.json()
    const note = await prisma.conversationNote.update({ where: { id: noteId }, data: { content } })
    return NextResponse.json({ note })
  } catch {
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { noteId } = await params
  try {
    await prisma.conversationNote.delete({ where: { id: noteId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 })
  }
}
