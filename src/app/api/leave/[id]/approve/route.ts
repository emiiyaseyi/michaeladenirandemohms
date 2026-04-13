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
      reliefOfficersList: true,
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isApproval = action === "APPROVED" || action === "APPROVED_WITH_COMMENT"
  const isRejected = action === "REJECTED"
  const isNudge    = action === "NUDGE"

  // ── Nudge: send a reminder notification to the approver for that stage ──────
  if (isNudge) {
    const targetStage = requestedStage as string
    const pendingApproval = request.approvals.find(a => a.stage === targetStage && !a.action)
    if (!pendingApproval) {
      return NextResponse.json({ error: "No pending approval for that stage" }, { status: 400 })
    }
    // Get the approver's userId
    const approverEmp = await prisma.employee.findUnique({
      where: { id: pendingApproval.employeeId },
      select: { userId: true, firstName: true, lastName: true },
    })
    if (approverEmp) {
      await prisma.notification.create({
        data: {
          userId: approverEmp.userId,
          employeeId: pendingApproval.employeeId,
          title: "Reminder: Leave Approval Pending",
          message: `You have a pending leave request from ${request.employee?.firstName} ${request.employee?.lastName} that requires your action at the ${targetStage.replace(/_/g, " ")} stage. Please review it.`,
          type: "WARNING",
          link: "/leave",
        },
      })
    }
    return NextResponse.json({ ok: true, message: "Nudge sent" })
  }

  // ── Determine stage ─────────────────────────────────────────────────────────
  // Admins can specify a stage; others are auto-assigned from their role
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "HR_ADMIN"].includes(user.role)
  const role = user.role

  let stage: "RELIEF_OFFICER" | "PROJECT_LEAD" | "TEAM_LEAD" | "MANAGER" | "ADMIN"
  if (isAdmin && requestedStage) {
    // Admin explicitly chose which stage to act on
    stage = requestedStage as typeof stage
  } else if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "HR_ADMIN") {
    stage = "ADMIN"
  } else if (role === "MANAGER") {
    stage = "MANAGER"
  } else if (role === "DEPARTMENT_LEAD") {
    stage = "TEAM_LEAD"
  } else {
    stage = "ADMIN"
  }

  // ── Find or create approval record for this stage ───────────────────────────
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

  // ── If relief officer stage: check if ALL officers have accepted ─────────────
  if (stage === "RELIEF_OFFICER" && isApproval) {
    // Reload all relief officer approvals to check
    const allReliefApprovals = await prisma.leaveApproval.findMany({
      where: { leaveRequestId: id, stage: "RELIEF_OFFICER" },
    })
    const allAccepted = allReliefApprovals.every(a =>
      a.action && ["APPROVED", "APPROVED_WITH_COMMENT", "ACCEPTED"].includes(a.action as string)
    )
    if (!allAccepted) {
      // Not all officers have responded yet - return early, keep PENDING
      return NextResponse.json({ request: await prisma.leaveRequest.findUnique({ where: { id }, include: { leaveType: { select: { name: true } } } }) })
    }
  }

  // ── Determine new request status ────────────────────────────────────────────
  let newStatus: string | undefined
  if (isRejected) {
    newStatus = "REJECTED"
  } else if (isApproval && stage === "ADMIN") {
    newStatus = "APPROVED"
  }
  // MANAGER / TEAM_LEAD approval: stays PENDING, notify employee of progress

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: newStatus as any ?? undefined,
      updatedAt: new Date(),
    },
    include: { leaveType: { select: { name: true } } },
  })

  // If fully approved, set employee to ON_LEAVE
  if (newStatus === "APPROVED") {
    await prisma.employee.update({
      where: { id: request.employeeId },
      data: { employeeStatus: "ON_LEAVE" },
    })
  }

  // ── Notify employee ─────────────────────────────────────────────────────────
  if (request.employee) {
    const stageLabel = stage.replace(/_/g, " ").toLowerCase()
    const notifType  = isApproval ? "SUCCESS" : isRejected ? "DANGER" : "WARNING"
    const notifTitle = isApproval
      ? stage === "ADMIN" ? "Leave Request Approved" : "Leave Progressing"
      : "Leave Request Rejected"
    const notifMsg = isApproval
      ? stage === "ADMIN"
        ? `Your ${(updated as any).leaveType?.name ?? "leave"} request has been approved.${comment ? ` Note: ${comment}` : ""}`
        : `Your leave request has been approved at the ${stageLabel} stage and is progressing.`
      : `Your ${(updated as any).leaveType?.name ?? "leave"} request was rejected at the ${stageLabel} stage.${comment ? ` Reason: ${comment}` : ""}`

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
