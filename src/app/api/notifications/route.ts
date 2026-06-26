import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

// GET /api/notifications - fetch current user's notifications (latest 30)
export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  })

  return NextResponse.json({ notifications, unreadCount })
}

// PATCH /api/notifications - mark one or all as read
// Body: { id: string } to mark one, or { all: true } to mark all
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json()

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })
  } else if (body.id) {
    await prisma.notification.update({
      where: { id: body.id },
      data: { isRead: true },
    })
  }

  return NextResponse.json({ ok: true })
}
