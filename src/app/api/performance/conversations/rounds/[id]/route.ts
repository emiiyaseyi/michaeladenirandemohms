import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
