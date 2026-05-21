import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, isAdminRole } from "@/lib/api-auth"

// GET /api/auth/forgot-password — admin: list all reset requests
export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminRole(user.role)) return forbidden()

  const requests = await prisma.passwordResetRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, role: true } },
      resolver: { select: { name: true } },
    },
  })

  return NextResponse.json({ requests })
}

// POST /api/auth/forgot-password — any visitor: submit a reset request
export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  if (dbUser) {
    const existing = await prisma.passwordResetRequest.findFirst({
      where: { email, status: "PENDING" },
    })
    if (!existing) {
      const resetReq = await prisma.passwordResetRequest.create({
        data: { email, userId: dbUser.id },
      })

      // Anonymous endpoint — log directly. Actor and target are both the requesting user.
      try {
        const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null
        const userAgent = req.headers.get("user-agent") ?? null
        await prisma.auditLog.create({
          data: {
            userId: dbUser.id, targetUserId: dbUser.id,
            action: "PASSWORD_RESET_REQUEST",
            entity: "PasswordResetRequest", entityId: resetReq.id,
            newValues: { email },
            ipAddress, userAgent,
          },
        })
      } catch (err) {
        console.error("[audit] password reset request log failed:", err)
      }

      // Notify all admins
      const admins = await prisma.user.findMany({
        where: { role: { in: ["SUPER_ADMIN"] }, isActive: true },
        select: { id: true },
      })
      if (admins.length > 0) {
        const name = await prisma.user.findUnique({
          where: { id: dbUser.id },
          select: { name: true },
        })
        await prisma.notification.createMany({
          data: admins.map(a => ({
            userId: a.id,
            title: "Password Reset Request",
            message: `${name?.name ?? email} has requested a password reset.`,
            type: "WARNING" as const,
            link: "/admin/people/profile-requests",
          })),
        })
      }
    }
  }

  // Always return success to avoid revealing whether email exists
  return NextResponse.json({ success: true })
}
