import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageConversations")
  if (perm) return perm

  try {
    const rounds = await prisma.conversationRound.findMany({
      include: {
        setup: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { scheduledDate: "desc" },
    })
    return NextResponse.json({ rounds })
  } catch {
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 })
  }
}
