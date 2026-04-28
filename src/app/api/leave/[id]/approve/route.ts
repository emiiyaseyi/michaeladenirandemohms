import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canApproveLeave) return forbidden("You are not authorised to approve leave")

  const { id } = await params
  const { action, comment, stage: requestedStage } = await req.json()

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
  const isNudge    = action === "NUDGE"

  if (isNudge) {
    const targetStage = requestedStage as string
    const pendingApproval = request.approvals.find(a => a.stage === targetStage && !a.action)
    if (!pendingApproval) return NextResponse.json({ error: "No pending approval for that stage" }, { status: 400 })
    const approverEmp = await prisma.employee.findUnique({ where: { id: pendingApproval.employeeId }, select: { userId: true, firstName: true, lastName: true } })
    if (approverEmp) {
      await prisma.notification.create({
        data: { userId: approverEmp.userId, employeeId: pendingApproval.employeeId, title: "Reminder: Leave Approval Pending", message: `You have a pending leave request from ${request.employee?.firstName} ${request.employee?.lastName} that requires your action.`, type: "WARNING", link: "/leave" },
      })
    }
    return NextResponse.json({ ok: true, message: "Nudge sent" })
  }

  // ADMIN can specify stage explicitly; TEAM_LEAD is always TEAM_LEAD stage
  const stage: "TEAM_LEAD" | "ADMIN" = user.role === "ADMIN"
    ? ((requestedStage as "TEAM_LEAD" | "ADMIN") ?? "ADMIN")
    : "TEAM_LEAD"

  const existingApproval = request.approvals.find(a => a.stage === stage && !a.action)
  if (existingApproval) {
    await prisma.leaveApproval.update({ where: { id: existingApproval.id }, data: { action: action as any, comment: comment || null, actedAt: new Date() } })
  } else {
    await prisma.leaveApproval.create({
      data: { leaveRequestId: id, employeeId: user.employeeId!, stage, action: action as any, comment: comment || null, actedAt: new Date(), deadline: new Date() },
    })
  }

  let newStatus: string | undefined
  if (isRejected) newStatus = "REJECTED"
  else if (isApproval && stage === "ADMIN") newStatus = "APPROVED"

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: newStatus as any ?? undefined, updatedAt: new Date() },
    include: { leaveType: { select: { name: true } } },
  })

  if (newStatus === "APPROVED") {
    await prisma.employee.update({ where: { id: request.employeeId }, data: { employeeStatus: "ON_LEAVE" } })
  }

  if (request.employee) {
    const stageLabel = stage === "ADMIN" ? "Admin" : "Team Lead"
    await prisma.notification.create({
      data: {
        userId: request.employee.userId, employeeId: request.employeeId,
        title: isApproval ? (stage === "ADMIN" ? "Leave Request Approved" : "Leave Progressing") : "Leave Request Rejected",
        message: isApproval
          ? stage === "ADMIN" ? `Your leave request has been approved.${comment ? ` Note: ${comment}` : ""}` : `Your leave request was approved at the ${stageLabel} stage and is progressing.`
          : `Your leave request was rejected at the ${stageLabel} stage.${comment ? ` Reason: ${comment}` : ""}`,
        type: isApproval ? "SUCCESS" : "DANGER",
        link: "/leave",
      },
    })
  }

  return NextResponse.json({ request: updated })
}
