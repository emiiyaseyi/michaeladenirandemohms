import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"

export async function GET(_req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const jobTitles = await prisma.$queryRaw`
    SELECT id, name, "isActive", "createdAt" FROM "JobTitle" WHERE "isActive" = true ORDER BY name ASC
  `
  return NextResponse.json({ jobTitles })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const existing = await prisma.$queryRaw`SELECT id FROM "JobTitle" WHERE LOWER(name) = LOWER(${name.trim()}) LIMIT 1`
  if ((existing as any[]).length > 0) return NextResponse.json({ error: "A job title with this name already exists" }, { status: 409 })

  const [title] = await prisma.$queryRaw`
    INSERT INTO "JobTitle" (id, name, "isActive", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${name.trim()}, true, NOW(), NOW())
    RETURNING id, name, "isActive"
  ` as any[]
  return NextResponse.json({ title }, { status: 201 })
}
