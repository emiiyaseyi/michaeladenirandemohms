import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await prisma.benefitCategory.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json({ categories })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  const permissions = (session.user as any).permissions ?? {}
  if (role !== "SUPER_ADMIN" && !permissions.canManageBenefits) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  try {
    const category = await prisma.benefitCategory.create({ data: { name: name.trim() } })
    return NextResponse.json({ category })
  } catch {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 })
  }
}
