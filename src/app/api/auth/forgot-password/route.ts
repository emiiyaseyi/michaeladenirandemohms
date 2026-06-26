import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { sendEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  if (dbUser) {
    const code = crypto.randomInt(100000, 1000000).toString()
    const codeHash = await bcrypt.hash(code, 10)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.passwordResetToken.create({ data: { email, codeHash, expiresAt } })

    sendEmail({
      eventKey: "password_reset_otp",
      to: email,
      variables: { code, expiresIn: "24 hours" },
    }).catch(err => console.error("[forgot-password] email send failed:", err))

    try {
      await prisma.auditLog.create({
        data: {
          userId: dbUser.id, targetUserId: dbUser.id,
          action: "PASSWORD_RESET_REQUEST",
          entity: "PasswordResetToken",
          newValues: { email },
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null,
          userAgent: req.headers.get("user-agent") ?? null,
        },
      })
    } catch { /* audit failure is non-fatal */ }
  }

  // Always return success — don't reveal whether the email is registered
  return NextResponse.json({ success: true })
}
