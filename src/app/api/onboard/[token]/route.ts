import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

function isExpired(invite: { expiresAt: Date }): boolean {
  return invite.expiresAt < new Date()
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await prisma.employeeInvite.findUnique({
    where: { token },
    select: {
      token: true,
      expiresAt: true,
      usedAt: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          user: { select: { email: true } },
        },
      },
    },
  })
  if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 })
  if (invite.usedAt) return NextResponse.json({ error: "This invite has already been used" }, { status: 410 })
  if (isExpired(invite)) return NextResponse.json({ error: "This invite link has expired" }, { status: 410 })

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
  if (body.action !== "set_password") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  }

  const { newPassword } = body
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }
  const userId = (invite.employee as any).user?.id
  if (!userId) return NextResponse.json({ error: "User account not found" }, { status: 404 })

  const hashed = bcrypt.hashSync(newPassword, 10)
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { password: hashed, mustChangePassword: false } }),
    prisma.employee.update({ where: { id: invite.employeeId }, data: { employeeStatus: "ACTIVE" } }),
    prisma.employeeInvite.update({ where: { token }, data: { usedAt: new Date() } }),
  ])

  return NextResponse.json({ ok: true })
}
