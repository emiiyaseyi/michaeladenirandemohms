import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()

  const { id } = await params

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, userId: true },
  })
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const defaultPwd = process.env.DEFAULT_USER_PASSWORD || "Welcome@DSN1"
  const hashed = await bcrypt.hash(defaultPwd, 10)

  await prisma.user.update({
    where: { id: employee.userId },
    data: { password: hashed, mustChangePassword: true },
  })

  await logAudit({
    req, actor: user, action: "EMPLOYEE_PASSWORD_RESET", entity: "User", entityId: employee.userId,
    targetUserId: employee.userId,
  })

  return NextResponse.json({ ok: true })
}
