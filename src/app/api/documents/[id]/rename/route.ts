import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const before = await prisma.orgDocument.findUnique({ where: { id }, select: { title: true } })
  const doc = await prisma.orgDocument.update({ where: { id }, data: { title: title.trim() } })

  await logAudit({
    req, actor: user, action: "DOC_RENAME", entity: "OrgDocument", entityId: id,
    oldValues: { title: before?.title }, newValues: { title: doc.title },
  })

  return NextResponse.json({ doc })
}
