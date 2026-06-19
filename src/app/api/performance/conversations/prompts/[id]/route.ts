import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageConversations")
  if (perm) return perm

  const { id } = await params
  try {
    const prompt = await prisma.conversationPrompt.findUnique({ where: { id } })
    if (!prompt) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ prompt })
  } catch {
    return NextResponse.json({ error: "Failed to fetch prompt" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  try {
    const before = await prisma.conversationPrompt.findUnique({ where: { id } })
    const { title, description, type } = await req.json()
    const prompt = await prisma.conversationPrompt.update({ where: { id }, data: { title, description, type } })

    const diff = before ? diffFields(before as any, prompt as any, ["title", "description", "type"] as any) : null
    if (diff) {
      await logAudit({
        req, actor: user, action: "CONVERSATION_PROMPT_EDIT", entity: "ConversationPrompt", entityId: id,
        oldValues: diff.old, newValues: diff.new,
      })
    }

    return NextResponse.json({ prompt })
  } catch {
    return NextResponse.json({ error: "Failed to update prompt" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  try {
    const before = await prisma.conversationPrompt.findUnique({ where: { id }, select: { title: true, type: true } })
    await prisma.conversationPrompt.delete({ where: { id } })

    await logAudit({
      req, actor: user, action: "CONVERSATION_PROMPT_DELETE", entity: "ConversationPrompt", entityId: id,
      oldValues: before ?? undefined,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete prompt" }, { status: 500 })
  }
}
