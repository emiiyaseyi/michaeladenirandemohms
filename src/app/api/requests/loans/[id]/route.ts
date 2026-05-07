import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()

  const { id } = await params
  const { action, declineReason, disburseWithPayroll, deductFromPayroll } = await req.json()

  const rows = await prisma.$queryRaw<any[]>`SELECT id, status FROM "LoanRequest" WHERE id = ${id} LIMIT 1`
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let newStatus = rows[0].status
  if (action === "APPROVE") newStatus = "APPROVED"
  if (action === "DECLINE") newStatus = "DECLINED"

  const setClauses: string[] = [`status = $2`, `"updatedAt" = NOW()`]
  const vals: any[] = [id, newStatus]
  let idx = 3
  if (declineReason) { setClauses.push(`"declineReason" = $${idx++}`); vals.push(declineReason) }
  if (typeof disburseWithPayroll === "boolean") { setClauses.push(`"disburseWithPayroll" = $${idx++}`); vals.push(disburseWithPayroll) }
  if (typeof deductFromPayroll === "boolean") { setClauses.push(`"deductFromPayroll" = $${idx++}`); vals.push(deductFromPayroll) }

  const [updated] = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "LoanRequest" SET ${setClauses.join(", ")} WHERE id = $1 RETURNING id, status, "declineReason", "disburseWithPayroll", "deductFromPayroll"`,
    ...vals
  )
  return NextResponse.json({ loan: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  await prisma.$queryRaw`DELETE FROM "LoanRequest" WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
