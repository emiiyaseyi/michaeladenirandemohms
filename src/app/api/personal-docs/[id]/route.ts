import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { requireAuth, forbidden, isAdminRole } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminRole(user.role)) return forbidden()

  const { id } = await params
  const { action, reviewNote } = await req.json()

  const doc = await prisma.personalDocument.findUnique({
    where: { id },
    include: { employee: { select: { userId: true, firstName: true, lastName: true } } },
  })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const status = action === "approve" ? "APPROVED" : "REJECTED"
  const updated = await prisma.personalDocument.update({
    where: { id },
    data: { status, reviewedBy: user.id, reviewNote: reviewNote || null, reviewedAt: new Date() },
    include: { reviewer: { select: { name: true } } },
  })

  const TYPE_LABELS: Record<string, string> = {
    SSCE: "SSCE Certificate", FIRST_DEGREE: "First Degree", NYSC: "NYSC Certificate",
    PROFESSIONAL_CERT: "Professional Certificate", UTILITY_BILL: "Utility Bill", OTHER: "Document",
  }

  await prisma.notification.create({
    data: {
      userId: doc.employee.userId,
      employeeId: doc.employeeId,
      title: status === "APPROVED" ? "Document Approved" : "Document Rejected",
      message: `Your ${TYPE_LABELS[doc.type] ?? doc.type} has been ${status === "APPROVED" ? "approved" : "rejected"}.${reviewNote ? ` Note: ${reviewNote}` : ""}`,
      type: status === "APPROVED" ? "SUCCESS" : "WARNING",
      link: "/self-service/profile?tab=documents",
    },
  })
  sendEmail({ eventKey: status === "APPROVED" ? "personal_doc_approved" : "personal_doc_rejected", toUserId: doc.employee.userId, variables: { employeeName: `${doc.employee.firstName} ${doc.employee.lastName}`, documentType: TYPE_LABELS[doc.type] ?? doc.type, note: reviewNote ?? "" } }).catch(() => {})

  return NextResponse.json({ doc: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const doc = await prisma.personalDocument.findUnique({ where: { id }, select: { employeeId: true } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner = user.employeeId === doc.employeeId
  if (!isAdminRole(user.role) && !isOwner) return forbidden()

  await prisma.personalDocument.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
