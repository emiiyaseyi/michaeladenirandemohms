import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

function isExpired(invite: { expiresAt: Date; viewedAt: Date | null }): boolean {
  if (invite.viewedAt) return Date.now() - invite.viewedAt.getTime() > WINDOW_MS
  return invite.expiresAt < new Date()
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await prisma.employeeInvite.findUnique({
    where: { token },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, employeeId: true },
        include: { user: { select: { email: true } } },
      },
    },
  })
  if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 })
  if (invite.usedAt) return NextResponse.json({ error: "This invite has already been used" }, { status: 410 })
  if (isExpired(invite)) return NextResponse.json({ error: "This invite link has expired" }, { status: 410 })

  // Start 24-hr countdown on first open
  if (!invite.viewedAt) {
    await prisma.employeeInvite.update({ where: { token }, data: { viewedAt: new Date() } })
  }

  const { user, ...empFields } = invite.employee as any
  return NextResponse.json({ employee: { ...empFields, email: user?.email ?? null } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await prisma.employeeInvite.findUnique({
    where: { token },
    include: { employee: { include: { user: { select: { id: true } } } } },
  })
  if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 })
  if (invite.usedAt) return NextResponse.json({ error: "Already completed" }, { status: 410 })
  if (isExpired(invite)) return NextResponse.json({ error: "Invite link has expired" }, { status: 410 })

  const body = await req.json()

  // ── set_password action ────────────────────────────────────────────────────
  if (body.action === "set_password") {
    const { newPassword } = body
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }
    const userId = (invite.employee as any).user?.id
    if (!userId) return NextResponse.json({ error: "User account not found" }, { status: 404 })
    const hashed = bcrypt.hashSync(newPassword, 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed, mustChangePassword: false } })
    return NextResponse.json({ ok: true })
  }

  // ── profile details action ────────────────────────────────────────────────
  const {
    gender, dateOfBirth, maritalStatus, nationality, stateOfOrigin,
    phone, alternatePhone, personalEmail,
    address, city, state, country, postalCode,
    nokName, nokPhone, nokRelationship,
  } = body

  await prisma.employee.update({
    where: { id: invite.employeeId },
    data: {
      gender: gender || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      maritalStatus: maritalStatus || undefined,
      nationality: nationality || undefined,
      stateOfOrigin: stateOfOrigin || undefined,
      phone: phone || undefined,
      alternatePhone: alternatePhone || undefined,
      personalEmail: personalEmail || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      postalCode: postalCode || undefined,
      nokName: nokName || undefined,
      nokPhone: nokPhone || undefined,
      nokRelationship: nokRelationship || undefined,
    },
  })

  await prisma.employeeInvite.update({
    where: { token },
    data: { usedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
