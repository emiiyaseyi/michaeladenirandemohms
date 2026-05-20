import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings") && !hasCap(user, "canViewAllEmployees")) return forbidden()

  const { employeeIds } = await req.json()
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return NextResponse.json({ error: "employeeIds array is required" }, { status: 400 })
  }

  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, userId: true },
  })

  const defaultPwd = process.env.DEFAULT_USER_PASSWORD || "Welcome@DSN1"
  const hashed = await bcrypt.hash(defaultPwd, 10)

  await prisma.user.updateMany({
    where: { id: { in: employees.map(e => e.userId) } },
    data: { password: hashed, mustChangePassword: true },
  })

  for (const e of employees) {
    await logAudit({
      req, actor: user, action: "EMPLOYEE_BULK_PASSWORD_RESET", entity: "User", entityId: e.userId,
      targetUserId: e.userId,
    })
  }

  return NextResponse.json({ ok: true, count: employees.length })
}
