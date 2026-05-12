import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const SYSTEM_TYPES = [
  "Computer Equipment", "Computer Software", "Computer Accessory",
  "Motor Vehicle", "Building", "Office Furniture", "Office Equipment",
  "Personal Gadget", "Personal Accessory", "General", "Other",
]

export async function GET() {
  const types = await prisma.assetType.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json({ types })
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const existing = await prisma.assetType.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } })
  if (existing) return NextResponse.json({ error: "Type already exists" }, { status: 400 })

  const type = await prisma.assetType.create({ data: { name: name.trim(), isSystem: false } })
  return NextResponse.json({ type }, { status: 201 })
}

export async function PUT() {
  // Seed system types if not present
  for (const name of SYSTEM_TYPES) {
    await prisma.assetType.upsert({
      where: { name },
      update: {},
      create: { name, isSystem: true },
    })
  }
  const types = await prisma.assetType.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json({ types })
}
