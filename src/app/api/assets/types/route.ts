import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

const SYSTEM_TYPES = [
  "Computer Equipment", "Computer Software", "Computer Accessory",
  "Motor Vehicle", "Building", "Office Furniture", "Office Equipment",
  "Personal Gadget", "Personal Accessory", "General", "Other",
]

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewAssets")
  if (perm) return perm

  const types = await prisma.assetType.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json({ types })
}

export async function POST(req: NextRequest) {
  const { user: u2, error: e2 } = await requireAuth()
  if (e2) return e2
  const p2 = requirePermission(u2, "canCreateAsset")
  if (p2) return p2

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
