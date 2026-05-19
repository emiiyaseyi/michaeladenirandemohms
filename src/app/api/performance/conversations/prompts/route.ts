import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: Request) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageConversations")
  if (perm) return perm

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const search = searchParams.get("search") ?? ""
  try {
    const prompts = await prisma.conversationPrompt.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ prompts })
  } catch {
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { user: u2, error: e2 } = await requireAuth()
  if (e2) return e2
  const p2 = requirePermission(u2, "canManageConversations")
  if (p2) return p2

  try {
    const { title, description, type } = await req.json()
    const prompt = await prisma.conversationPrompt.create({
      data: { title, description, type: type ?? "CHECK_IN" },
    })
    await logAudit({
      req, actor: u2, action: "CONVERSATION_PROMPT_CREATE", entity: "ConversationPrompt", entityId: prompt.id,
      newValues: { title, type },
    })
    return NextResponse.json({ prompt }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create prompt" }, { status: 500 })
  }
}
