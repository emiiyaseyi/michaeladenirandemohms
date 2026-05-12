import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const prompt = await prisma.conversationPrompt.findUnique({ where: { id } })
    if (!prompt) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ prompt })
  } catch {
    return NextResponse.json({ error: "Failed to fetch prompt" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { title, description, type } = await req.json()
    const prompt = await prisma.conversationPrompt.update({ where: { id }, data: { title, description, type } })
    return NextResponse.json({ prompt })
  } catch {
    return NextResponse.json({ error: "Failed to update prompt" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.conversationPrompt.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete prompt" }, { status: 500 })
  }
}
