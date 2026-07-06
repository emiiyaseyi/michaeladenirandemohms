import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, requirePermission, hasCap } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = hasCap(user, "canViewAllEmployees")
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

  const isAdmin = hasCap(user, "canViewAllEmployees")
  if (!isAdmin) return forbidden("Only admins can create announcements")
  const perm = requirePermission(user, "canCreateAnnouncement")
  if (perm) return perm

  const body = await req.json()
  const { title, body: text, type = "TEXT", videoUrl, imageUrl, behavior = "NOTIFICATION_BAR", targetRoles = [], sendEmail: sendEmailFlag = false, status = "DRAFT" } = body
  // EMAIL_ONLY announcements have no in-app renderer - email delivery is mandatory, not optional.
  const sendEmail = behavior === "EMAIL_ONLY" ? true : sendEmailFlag

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

  await logAudit({
    req, actor: user, action: "ANNOUNCEMENT_CREATE", entity: "Announcement", entityId: ann.id,
    newValues: { title, type, behavior, targetRoles, sendEmail, status },
  })

  // Send email if publishing with sendEmail flag
  if (ann.status === "PUBLISHED" && ann.sendEmail) {
    const { sendEmailToMany } = await import("@/lib/email")
    const where: any = { isActive: true }
    if (targetRoles.length > 0) where.role = { in: targetRoles }
    const recipients = await prisma.user.findMany({ where, select: { id: true } })
    const userIds = recipients.map((u: any) => u.id)
    const creator = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } })
    sendEmailToMany(userIds, {
      eventKey: "announcement_published",
      variables: {
        announcementTitle: ann.title,
        announcementBody: ann.body ?? "",
        publishedBy: creator?.name ?? "Admin",
      },
    }).catch(() => {})
  }

  return NextResponse.json({ announcement: ann }, { status: 201 })
}
