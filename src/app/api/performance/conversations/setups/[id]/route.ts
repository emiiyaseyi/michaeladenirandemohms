import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
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
    return NextResponse.json({ setup })
  } catch {
    return NextResponse.json({ error: "Failed to update setup" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.conversationSetup.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete setup" }, { status: 500 })
  }
}
