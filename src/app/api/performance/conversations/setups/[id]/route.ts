import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const setup = await prisma.conversationSetup.findUnique({
      where: { id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    })
    if (!setup) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ setup })
  } catch {
    return NextResponse.json({ error: "Failed to fetch setup" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  try {
    const before = await prisma.conversationSetup.findUnique({ where: { id } })
    const body = await req.json()
    const { conversationWith, scheduledDate, startTime, endTime, frequency, conversationType } = body
    const setup = await prisma.conversationSetup.update({
      where: { id },
      data: {
        conversationWith,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        startTime,
        endTime,
        frequency,
        conversationType,
      },
    })

    const diff = before ? diffFields(before as any, setup as any, ["conversationWith", "scheduledDate", "startTime", "endTime", "frequency", "conversationType"] as any) : null
    if (diff) {
      await logAudit({
        req, actor: user, action: "CONVERSATION_SETUP_EDIT", entity: "ConversationSetup", entityId: id,
        oldValues: diff.old, newValues: diff.new,
      })
    }

    return NextResponse.json({ setup })
  } catch {
    return NextResponse.json({ error: "Failed to update setup" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  try {
    const before = await prisma.conversationSetup.findUnique({ where: { id }, select: { conversationWith: true, conversationType: true, employee: { select: { userId: true } } } })
    await prisma.conversationSetup.delete({ where: { id } })

    await logAudit({
      req, actor: user, action: "CONVERSATION_SETUP_DELETE", entity: "ConversationSetup", entityId: id,
      targetUserId: before?.employee?.userId ?? null,
      oldValues: before ? { conversationWith: before.conversationWith, conversationType: before.conversationType } : undefined,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete setup" }, { status: 500 })
  }
}
