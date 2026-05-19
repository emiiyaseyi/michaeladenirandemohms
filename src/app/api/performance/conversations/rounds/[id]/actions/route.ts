import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id: roundId } = await params
  try {
    const { title, startDate, endDate } = await req.json()
    const action = await prisma.conversationAction.create({
      data: { roundId, title, startDate: new Date(startDate), endDate: new Date(endDate) },
    })

    await logAudit({
      req, actor: user, action: "CONVERSATION_ACTION_CREATE", entity: "ConversationRound", entityId: roundId,
      newValues: { actionId: action.id, title, startDate, endDate },
    })

    return NextResponse.json({ action }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 })
  }
}
