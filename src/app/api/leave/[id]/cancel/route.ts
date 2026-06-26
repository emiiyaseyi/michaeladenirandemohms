import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const isOrgAdmin = user.role === "SUPER_ADMIN" || !!user.permissions["canViewAllLeave"]

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      approvals: { select: { action: true } },
      employee: { select: { userId: true } },
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner = request.employeeId === user.employeeId
  if (!isOrgAdmin && !isOwner) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  }

  if (!["PENDING", "APPROVED"].includes(request.status)) {
    return NextResponse.json({ error: "Can only cancel pending or approved requests" }, { status: 400 })
  }

  // Owner can only cancel a PENDING request while NO approver has acted yet.
  // (Once a PL or HR has approved/rejected, the owner has to ask an admin.)
  if (!isOrgAdmin && isOwner) {
    const someoneActed = (request.approvals ?? []).some(a => !!a.action)
    if (someoneActed) {
      return NextResponse.json({ error: "An approver has already acted on this request - ask an admin to cancel it." }, { status: 400 })
    }
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: isOrgAdmin && !isOwner ? "CANCELLED_BY_ADMIN" : "CANCELLED",
    },
  })

  // If was approved, restore employee status
  if (request.status === "APPROVED") {
    await prisma.employee.update({
      where: { id: request.employeeId },
      data: { employeeStatus: "ACTIVE" },
    })
  }

  await logAudit({
    req, actor: user, action: "LEAVE_CANCEL", entity: "LeaveRequest", entityId: id,
    targetUserId: request.employee?.userId ?? null,
    oldValues: { status: request.status },
    newValues: { status: updated.status },
  })

  return NextResponse.json({ request: updated })
}
