import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true, name: true, email: true, isActive: true, createdAt: true,
      employee: { select: { id: true, phone: true, profilePhoto: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ admins })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const body = await req.json()
  const { firstName, lastName, email, phone } = body
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })

  const bcrypt = await import("bcryptjs")
  const hashed = await bcrypt.hash(process.env.DEFAULT_USER_PASSWORD || "Welcome@DSN1", 10)

  const admin = await prisma.user.create({
    data: {
      name: `${firstName} ${lastName}`.trim(),
      email,
      password: hashed,
      role: "ADMIN",
      mustChangePassword: true,
    },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true, employee: { select: { id: true, phone: true, profilePhoto: true } } },
  })

  return NextResponse.json({ admin }, { status: 201 })
}
