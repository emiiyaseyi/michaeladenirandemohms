import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: roundId } = await params
  try {
    const { title, startDate, endDate } = await req.json()
    const action = await prisma.conversationAction.create({
      data: { roundId, title, startDate: new Date(startDate), endDate: new Date(endDate) },
    })
    return NextResponse.json({ action }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 })
  }
}
