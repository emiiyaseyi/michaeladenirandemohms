import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()

  const { id } = await params
  const { action, declineReason } = await req.json()

  const rows = await prisma.$queryRaw<any[]>`SELECT id, status, "employeeId" FROM "DocumentRequest" WHERE id = ${id} LIMIT 1`
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let newStatus = rows[0].status
  if (action === "APPROVE") newStatus = "READY"
  if (action === "DECLINE") newStatus = "DECLINED"

  const setClauses = [`status = $2`, `"updatedAt" = NOW()`]
  const vals: any[] = [id, newStatus]
  if (declineReason) { setClauses.push(`"declineReason" = $3`); vals.push(declineReason) }

  const [updated] = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "DocumentRequest" SET ${setClauses.join(", ")} WHERE id = $1 RETURNING id, status, "declineReason"`,
    ...vals
  )

  const ownerEmp = await prisma.employee.findUnique({ where: { id: rows[0].employeeId }, select: { userId: true } })
  await logAudit({
    req, actor: user,
    action: action === "APPROVE" ? "DOC_REQUEST_APPROVE" : "DOC_REQUEST_DECLINE",
    entity: "DocumentRequest", entityId: id,
    targetUserId: ownerEmp?.userId ?? null,
    oldValues: { status: rows[0].status }, newValues: { status: newStatus },
    reason: declineReason ?? null,
  })

  return NextResponse.json({ request: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const rows = await prisma.$queryRaw<any[]>`SELECT id, "employeeId", "documentType", status FROM "DocumentRequest" WHERE id = ${id} LIMIT 1`
  await prisma.$queryRaw`DELETE FROM "DocumentRequest" WHERE id = ${id}`

  if (rows[0]) {
    const ownerEmp = await prisma.employee.findUnique({ where: { id: rows[0].employeeId }, select: { userId: true } })
    await logAudit({
      req, actor: user, action: "DOC_REQUEST_DELETE", entity: "DocumentRequest", entityId: id,
      targetUserId: ownerEmp?.userId ?? null,
      oldValues: { documentType: rows[0].documentType, status: rows[0].status },
    })
  }

  return NextResponse.json({ ok: true })
}
