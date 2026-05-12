import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const search = searchParams.get("search") ?? ""
  try {
    const prompts = await prisma.conversationPrompt.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ prompts })
  } catch {
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { title, description, type } = await req.json()
    const prompt = await prisma.conversationPrompt.create({
      data: { title, description, type: type ?? "CHECK_IN" },
    })
    return NextResponse.json({ prompt }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create prompt" }, { status: 500 })
  }
}
