import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, caps, requirePermission } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = caps(user.role).canViewAllEmployees
  if (!isAdmin) return forbidden()
  const perm = requirePermission(user, "canEditAnnouncement")
  if (perm) return perm

  const { id } = await params
  const body = await req.json()
  const { title, body: text, type, videoUrl, imageUrl, behavior, targetRoles, sendEmail, status } = body

  const data: any = {}
  if (title !== undefined) data.title = title
  if (text !== undefined) data.body = text
  if (type !== undefined) data.type = type
  if (videoUrl !== undefined) data.videoUrl = videoUrl || null
  if (imageUrl !== undefined) data.imageUrl = imageUrl || null
  if (behavior !== undefined) data.behavior = behavior
  if (targetRoles !== undefined) data.targetRoles = targetRoles
  if (sendEmail !== undefined) data.sendEmail = sendEmail
  if (status !== undefined) {
    data.status = status
    if (status === "PUBLISHED" && !data.publishedAt) data.publishedAt = new Date()
    if (status === "RETIRED") data.retiredAt = new Date()
  }

  const before = await prisma.announcement.findUnique({ where: { id } })
  const ann = await prisma.announcement.update({
    where: { id },
    data,
    include: { createdBy: { select: { name: true } } },
  })

  const diff = before ? diffFields(before as any, ann as any, ["title", "body", "type", "behavior", "targetRoles", "sendEmail", "status"] as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "ANNOUNCEMENT_EDIT", entity: "Announcement", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  // Send email if newly published with sendEmail flag
  if (ann.status === "PUBLISHED" && ann.sendEmail) {
    const { sendEmailToMany } = await import("@/lib/email")
    const where: any = { isActive: true }
    if (ann.targetRoles && ann.targetRoles.length > 0) where.role = { in: ann.targetRoles }
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

  return NextResponse.json({ announcement: ann })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (!caps(user.role).canViewAllEmployees) return forbidden()
  const delPerm = requirePermission(user, "canDeleteAnnouncement")
  if (delPerm) return delPerm

  const { id } = await params
  const before = await prisma.announcement.findUnique({ where: { id }, select: { title: true } })
  // Soft delete — set to RETIRED so it can be restored from trash
  await prisma.announcement.update({
    where: { id },
    data: { status: "RETIRED", retiredAt: new Date() },
  })

  await logAudit({
    req, actor: user, action: "ANNOUNCEMENT_ARCHIVE", entity: "Announcement", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
