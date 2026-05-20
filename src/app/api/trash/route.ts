import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const [announcements, documents] = await Promise.all([
    prisma.announcement.findMany({
      where: { status: "RETIRED" },
      include: { createdBy: { select: { name: true } } },
      orderBy: { retiredAt: "desc" },
    }),
    prisma.orgDocument.findMany({
      where: { isActive: false },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return NextResponse.json({ announcements, documents })
}

// Restore: PATCH /api/trash with { type, id }
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const { type, id } = await req.json()

  if (type === "announcement") {
    await prisma.announcement.update({
      where: { id },
      data: { status: "DRAFT", retiredAt: null },
    })
  } else if (type === "document") {
    await prisma.orgDocument.update({
      where: { id },
      data: { isActive: true },
    })
  } else {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  }

  await logAudit({
    req, actor: user, action: "TRASH_RESTORE",
    entity: type === "announcement" ? "Announcement" : "OrgDocument",
    entityId: id,
  })

  return NextResponse.json({ ok: true })
}

// Permanent delete: DELETE /api/trash with ?type=...&id=...
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const id = searchParams.get("id")
  if (!type || !id) return NextResponse.json({ error: "type and id required" }, { status: 400 })

  let snapshot: any = null
  if (type === "announcement") {
    snapshot = await prisma.announcement.findUnique({ where: { id }, select: { title: true, status: true } })
    await prisma.announcement.delete({ where: { id } })
  } else if (type === "document") {
    snapshot = await prisma.orgDocument.findUnique({ where: { id }, select: { title: true, fileUrl: true } })
    await prisma.orgDocument.delete({ where: { id } })
  } else {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  }

  await logAudit({
    req, actor: user, action: "TRASH_PURGE",
    entity: type === "announcement" ? "Announcement" : "OrgDocument",
    entityId: id,
    oldValues: snapshot ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
