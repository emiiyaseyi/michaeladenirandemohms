import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const { employeeIds } = await req.json()
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return NextResponse.json({ error: "employeeIds required" }, { status: 400 })
  }

  // Create DocAck records for each employee (skip if already exists)
  await Promise.all(
    employeeIds.map(empId =>
      prisma.docAck.upsert({
        where: { documentId_employeeId: { documentId: id, employeeId: empId } },
        create: { documentId: id, employeeId: empId, acknowledged: false },
        update: {},
      })
    )
  )

  await logAudit({
    req, actor: user, action: "DOC_ASSIGN", entity: "OrgDocument", entityId: id,
    newValues: { employeeIds, count: employeeIds.length },
  })

  return NextResponse.json({ ok: true })
}
