import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
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
