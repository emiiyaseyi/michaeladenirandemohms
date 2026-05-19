import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id: roundId } = await params
  try {
    const { content } = await req.json()
    const note = await prisma.conversationNote.create({
      data: { roundId, content },
    })

    await logAudit({
      req, actor: user, action: "CONVERSATION_NOTE_CREATE", entity: "ConversationRound", entityId: roundId,
      newValues: { noteId: note.id, contentLength: content?.length ?? 0 },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 })
  }
}
