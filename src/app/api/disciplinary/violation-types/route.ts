import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""

  const types = await prisma.violationType.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ types })
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  const existing = await prisma.violationType.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } })
  if (existing) return NextResponse.json({ error: "A violation type with this name already exists" }, { status: 409 })
  const type = await prisma.violationType.create({ data: { name: name.trim() } })
  return NextResponse.json({ type }, { status: 201 })
}
