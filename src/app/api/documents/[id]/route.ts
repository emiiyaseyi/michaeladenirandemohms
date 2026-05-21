import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (!hasCap(user, "canViewAllEmployees")) return forbidden()

  const { id } = await params
  const body = await req.json()
  const { title, category, description, canView, canDownload, requiresAck, canCopy } = body

  const before = await prisma.orgDocument.findUnique({ where: { id } })

  const doc = await prisma.orgDocument.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(canView !== undefined && { canView }),
      ...(canDownload !== undefined && { canDownload }),
      ...(requiresAck !== undefined && { requiresAck }),
      ...(canCopy !== undefined && { canCopy }),
    },
    include: { uploadedBy: { select: { name: true } } },
  })

  const diff = before ? diffFields(before as any, doc as any, ["title", "category", "description", "canView", "canDownload", "requiresAck", "canCopy"] as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "DOC_EDIT", entity: "OrgDocument", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ doc })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (!hasCap(user, "canViewAllEmployees")) return forbidden()

  const { id } = await params
  const permanent = new URL(req.url).searchParams.get("permanent") === "true"

  const before = await prisma.orgDocument.findUnique({ where: { id }, select: { title: true, category: true, fileUrl: true } })

  if (permanent) {
    await prisma.orgDocument.delete({ where: { id } })
  } else {
    await prisma.orgDocument.update({ where: { id }, data: { isActive: false } })
  }

  await logAudit({
    req, actor: user,
    action: permanent ? "DOC_DELETE" : "DOC_ARCHIVE",
    entity: "OrgDocument", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
