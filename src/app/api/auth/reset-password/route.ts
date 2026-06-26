import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { email, code, newPassword } = await req.json()

  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }
  if (/\s/.test(newPassword)) return NextResponse.json({ error: "Password must not contain spaces." }, { status: 400 })
  if (newPassword.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  if (!/[A-Z]/.test(newPassword)) return NextResponse.json({ error: "Password must contain at least one uppercase letter." }, { status: 400 })
  if (!/[0-9]/.test(newPassword)) return NextResponse.json({ error: "Password must contain at least one number." }, { status: 400 })
  if (!/[^A-Za-z0-9]/.test(newPassword)) return NextResponse.json({ error: "Password must contain at least one symbol (e.g. !@#$%)." }, { status: 400 })

  const token = await prisma.passwordResetToken.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  })

  if (!token) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
  }

  const codeMatch = await bcrypt.compare(code, token.codeHash)
  if (!codeMatch) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
  ])

  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id, targetUserId: user.id,
        action: "PASSWORD_RESET_COMPLETE",
        entity: "User",
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent") ?? null,
      },
    })
  } catch { /* audit failure is non-fatal */ }

  return NextResponse.json({ success: true })
}
