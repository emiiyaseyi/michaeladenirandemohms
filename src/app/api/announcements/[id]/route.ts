import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = ["ADMIN","ADMIN","ADMIN","TEAM_LEAD"].includes(user.role)
  if (!isAdmin) return forbidden()

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

  const ann = await prisma.announcement.update({
    where: { id },
    data,
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json({ announcement: ann })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = ["ADMIN","ADMIN","ADMIN"].includes(user.role)
  if (!isAdmin) return forbidden()

  const { id } = await params
  // Soft delete — set to RETIRED so it can be restored from trash
  await prisma.announcement.update({
    where: { id },
    data: { status: "RETIRED", retiredAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
