import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const [announcements, documents, projects] = await Promise.all([
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
    prisma.project.findMany({
      where: { status: "CANCELLED" },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return NextResponse.json({ announcements, documents, projects })
}

// Restore: PATCH /api/trash with { type, id }
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

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
  } else if (type === "project") {
    await prisma.project.update({
      where: { id },
      data: { status: "ON_HOLD" },
    })
  } else {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

// Permanent delete: DELETE /api/trash with ?type=...&id=...
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const id = searchParams.get("id")
  if (!type || !id) return NextResponse.json({ error: "type and id required" }, { status: 400 })

  if (type === "announcement") {
    await prisma.announcement.delete({ where: { id } })
  } else if (type === "document") {
    await prisma.orgDocument.delete({ where: { id } })
  } else if (type === "project") {
    await prisma.projectAssignment.deleteMany({ where: { projectId: id } })
    await prisma.project.delete({ where: { id } })
  } else {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
