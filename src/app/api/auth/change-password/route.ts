import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

// POST /api/auth/change-password
// Body: { newPassword, currentPassword?, mode?: "first-login" | "change" }
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { newPassword, currentPassword, mode } = await req.json()

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } })
  if (!dbUser?.password) return NextResponse.json({ error: "User not found" }, { status: 404 })

  if (mode !== "first-login") {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 })
    }
    const valid = await bcrypt.compare(currentPassword, dbUser.password)
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, mustChangePassword: false },
  })

  return NextResponse.json({ success: true })
}
