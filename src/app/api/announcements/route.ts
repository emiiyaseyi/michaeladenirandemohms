import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = ["SUPER_ADMIN","ADMIN","HR_ADMIN","MANAGER"].includes(user.role)
  const { searchParams } = req.nextUrl
  const includeAll = searchParams.get("all") === "1"

  const where = isAdmin && includeAll
    ? {}
    : {
        status: "PUBLISHED" as const,
        OR: [
          { targetRoles: { isEmpty: true } },
          { targetRoles: { has: user.role } },
        ],
      }

  const announcements = await prisma.announcement.findMany({
    where,
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ announcements })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = ["SUPER_ADMIN","ADMIN","HR_ADMIN","MANAGER"].includes(user.role)
  if (!isAdmin) return forbidden("Only admins can create announcements")

  const body = await req.json()
  const { title, body: text, type = "TEXT", videoUrl, imageUrl, behavior = "NOTIFICATION_BAR", targetRoles = [], sendEmail = false, status = "DRAFT" } = body

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })

  const ann = await prisma.announcement.create({
    data: {
      title,
      body: text || null,
      type,
      videoUrl: videoUrl || null,
      imageUrl: imageUrl || null,
      behavior,
      targetRoles,
      sendEmail,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      createdById: user.id,
    },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json({ announcement: ann }, { status: 201 })
}
