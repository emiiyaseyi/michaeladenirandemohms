import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const body = await req.json()

  const rows = await prisma.$queryRaw`SELECT id FROM "JobTitle" WHERE id = ${id} LIMIT 1` as any[]
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (body.name) {
    const dup = await prisma.$queryRaw`SELECT id FROM "JobTitle" WHERE LOWER(name) = LOWER(${body.name.trim()}) AND id != ${id} LIMIT 1` as any[]
    if (dup.length > 0) return NextResponse.json({ error: "Name already exists" }, { status: 409 })
  }

  const setClauses: string[] = []
  const values: any[] = []
  if (body.name) { setClauses.push(`name = $${values.push(body.name.trim())}`); }
  if (typeof body.isActive === "boolean") { setClauses.push(`"isActive" = $${values.push(body.isActive)}`); }
  setClauses.push(`"updatedAt" = NOW()`)

  const [title] = await prisma.$queryRawUnsafe(
    `UPDATE "JobTitle" SET ${setClauses.join(", ")} WHERE id = '${id}' RETURNING id, name, "isActive"`,
    ...values
  ) as any[]
  return NextResponse.json({ title })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  await prisma.$queryRaw`DELETE FROM "JobTitle" WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
