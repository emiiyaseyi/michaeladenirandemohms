import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const groups = await prisma.performanceGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  })
  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const { name, description, memberIds } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const group = await prisma.performanceGroup.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      members: { create: (memberIds ?? []).map((employeeId: string) => ({ employeeId })) },
    },
  })
  return NextResponse.json({ group }, { status: 201 })
}
