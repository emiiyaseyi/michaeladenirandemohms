import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageConversations")
  if (perm) return perm

  const { id } = await params
  try {
    const round = await prisma.conversationRound.findUnique({
      where: { id },
      include: {
        setup: {
          include: { employee: { select: { id: true, firstName: true, lastName: true } } },
        },
        actions: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "asc" } },
      },
    })
    if (!round) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ round })
  } catch {
    return NextResponse.json({ error: "Failed to fetch round" }, { status: 500 })
  }
}
