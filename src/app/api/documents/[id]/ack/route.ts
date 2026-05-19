import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const emp = await prisma.employee.findFirst({
    where: { userId: user.id },
    select: { id: true, firstName: true, lastName: true },
  })
  if (!emp) return NextResponse.json({ error: "Employee record not found" }, { status: 404 })

  const doc = await prisma.orgDocument.findUnique({ where: { id } })
  if (!doc || !doc.isActive) return NextResponse.json({ error: "Document not found" }, { status: 404 })

  // Parse body (always JSON from the updated client)
  const body = await req.json().catch(() => ({}))
  const typedName = (body.name ?? "").trim()
  const profileName = `${emp.firstName} ${emp.lastName}`.trim()

  if (!typedName) {
    return NextResponse.json({ error: "Please type your full name to acknowledge" }, { status: 422 })
  }
  if (typedName.toLowerCase() !== profileName.toLowerCase()) {
    return NextResponse.json({ error: `Name does not match your profile. Expected: ${profileName}` }, { status: 422 })
  }

  const ack = await prisma.docAck.upsert({
    where: { documentId_employeeId: { documentId: id, employeeId: emp.id } },
    update: { acknowledged: true, acknowledgedAt: new Date() },
    create: {
      documentId: id,
      employeeId: emp.id,
      acknowledged: true,
      acknowledgedAt: new Date(),
    },
  })

  await logAudit({
    req, actor: user, action: "DOC_ACK", entity: "OrgDocument", entityId: id,
    targetUserId: user.id,
    newValues: { typedName, acknowledgedAt: ack.acknowledgedAt },
  })

  return NextResponse.json({ ack })
}
