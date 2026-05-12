import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: roundId } = await params
  try {
    const { content } = await req.json()
    const note = await prisma.conversationNote.create({
      data: { roundId, content },
    })
    return NextResponse.json({ note }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 })
  }
}
