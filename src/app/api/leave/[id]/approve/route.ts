import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canApproveLeave) return forbidden("You are not authorised to approve leave")

  const { id } = await params
  const { action, comment } = await req.json()

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      leaveType: { select: { name: true } },
      approvals: { orderBy: { createdAt: "asc" } },
      employee: { select: { userId: true, firstName: true, lastName: true } },
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isApproval = action === "APPROVED" || action === "APPROVED_WITH_COMMENT"
  const isRejected = action === "REJECTED"

  // Determine stage from role
  const role = user.role
  let stage: "RELIEF_OFFICER" | "TEAM_LEAD" | "MANAGER" | "ADMIN"
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "HR_ADMIN") stage = "ADMIN"
  else if (role === "MANAGER") stage = "MANAGER"
  else if (role === "DEPARTMENT_LEAD") stage = "TEAM_LEAD"
  else stage = "ADMIN"

  // Find pending approval for this stage or create one
  const existingApproval = request.approvals.find(a => a.stage === stage && !a.action)
  if (existingApproval) {
    await prisma.leaveApproval.update({
      where: { id: existingApproval.id },
      data: { action: action as any, comment: comment || null, actedAt: new Date() },
    })
  } else {
    await prisma.leaveApproval.create({
      data: {
        leaveRequestId: id,
        employeeId: user.employeeId!,
        stage,
        action: action as any,
        comment: comment || null,
        actedAt: new Date(),
        deadline: new Date(),
      },
    })
  }

  // Determine new status
  // If rejected at any stage, reject the request
  // If approved by ADMIN stage (or no approval chain), mark as APPROVED
  let newStatus: string | undefined
  if (isRejected) {
    newStatus = "REJECTED"
  } else if (isApproval) {
    // Mark as fully approved — in a simple flow, admin approval is final
    // For multi-stage: only set APPROVED when ADMIN acts, otherwise keep PENDING
    if (stage === "ADMIN") {
      newStatus = "APPROVED"
    }
    // For MANAGER/TEAM_LEAD approval: status stays PENDING, next stage notified
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: newStatus as any ?? undefined,
      updatedAt: new Date(),
    },
    include: { leaveType: { select: { name: true } } },
  })

  // If fully approved, update employee status to ON_LEAVE
  if (newStatus === "APPROVED") {
    await prisma.employee.update({
      where: { id: request.employeeId },
      data: { employeeStatus: "ON_LEAVE" },
    })
  }

  // Notify employee
  if (request.employee) {
    const notifType = isApproval ? "SUCCESS" : isRejected ? "DANGER" : "WARNING"
    const notifTitle = isApproval
      ? stage === "ADMIN" ? "Leave Request Approved" : "Leave Progressing"
      : "Leave Request Rejected"
    const notifMsg = isApproval
      ? stage === "ADMIN"
        ? `Your ${(updated as any).leaveType?.name ?? "leave"} request has been approved.${comment ? ` Note: ${comment}` : ""}`
        : `Your leave request has been approved by ${stage.replace("_", " ").toLowerCase()} and is progressing to the next stage.`
      : `Your ${(updated as any).leaveType?.name ?? "leave"} request was rejected by ${stage.replace("_", " ").toLowerCase()}.${comment ? ` Reason: ${comment}` : ""}`

    await prisma.notification.create({
      data: {
        userId: request.employee.userId,
        employeeId: request.employeeId,
        title: notifTitle,
        message: notifMsg,
        type: notifType,
        link: "/leave",
      },
    })
  }

  return NextResponse.json({ request: updated })
}
