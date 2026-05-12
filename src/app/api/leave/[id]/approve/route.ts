import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, roleBasePath } from "@/lib/api-auth"

async function getHRAdminRecipients(): Promise<{ userId: string; employeeId?: string }[]> {
  const [superAdmins, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true, employee: { select: { id: true } } },
    }),
    prisma.userAdminRole.findMany({
      include: {
        adminRole: { select: { permissions: true } },
        user: { select: { id: true, isActive: true, employee: { select: { id: true } } } },
      },
    }),
  ])
  const permsMap = new Map<string, Record<string, boolean>>()
  const infoMap = new Map<string, { id: string; employeeId?: string }>()
  for (const { user: u, adminRole } of assignments) {
    if (!u.isActive) continue
    const merged = permsMap.get(u.id) ?? {}
    const p = adminRole.permissions as Record<string, boolean>
    for (const [k, v] of Object.entries(p)) if (v) merged[k] = true
    permsMap.set(u.id, merged)
    infoMap.set(u.id, { id: u.id, employeeId: u.employee?.id })
  }
  const out = new Map<string, { userId: string; employeeId?: string }>()
  for (const u of superAdmins) out.set(u.id, { userId: u.id, employeeId: u.employee?.id })
  for (const [id, perms] of permsMap.entries()) {
    if (perms["canApproveLeave"] && perms["canViewAllLeave"]) {
      out.set(id, { userId: id, employeeId: infoMap.get(id)?.employeeId })
    }
  }
  return [...out.values()]
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const { action, comment } = await req.json()

  const isApproval = action === "APPROVED" || action === "APPROVED_WITH_COMMENT"
  const isRejected = action === "REJECTED"

  const canApproveAtAll = user.role === "SUPER_ADMIN" || user.role === "PROJECT_LEAD" || !!user.permissions["canApproveLeave"]
  if (!canApproveAtAll) return forbidden("You are not authorised to approve leave")

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      leaveType: { select: { name: true } },
      approvals: { orderBy: { createdAt: "asc" } },
      employee: {
        select: {
          id: true, userId: true, firstName: true, lastName: true,
          user: { select: { role: true } },
        },
      },
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Determine stage: SUPER_ADMIN is always HR_ADMIN.
  // For everyone else: if they have a pending PL approval record → PROJECT_LEAD stage.
  // Otherwise (elevated admin acting as HR approver) → HR_ADMIN stage.
  const hasPLRecord = user.role !== "SUPER_ADMIN" && request.approvals.some(
    a => a.stage === "PROJECT_LEAD" && a.employeeId === (user.employeeId ?? "NONE") && !a.action
  )
  const stage: "PROJECT_LEAD" | "HR_ADMIN" = user.role === "SUPER_ADMIN" || !hasPLRecord ? "HR_ADMIN" : "PROJECT_LEAD"

  // HR admins / super admin can bypass the PL stage entirely
  // No allPLsDone gate for HR-level approvers

  if (stage === "PROJECT_LEAD") {
    if (!user.employeeId) return forbidden("No employee profile")
    const myApproval = request.approvals.find(a => a.stage === "PROJECT_LEAD" && a.employeeId === user.employeeId && !a.action)
    if (!myApproval) return NextResponse.json({ error: "No pending approval assigned to you" }, { status: 403 })
    await prisma.leaveApproval.update({
      where: { id: myApproval.id },
      data: { action: action as any, comment: comment || null, actedAt: new Date() },
    })
  } else {
    const existing = request.approvals.find(a => a.stage === "HR_ADMIN" && !a.action)
    if (existing) {
      await prisma.leaveApproval.update({ where: { id: existing.id }, data: { action: action as any, comment: comment || null, actedAt: new Date() } })
    } else if (user.employeeId) {
      await prisma.leaveApproval.create({
        data: { leaveRequestId: id, employeeId: user.employeeId, stage: "HR_ADMIN", action: action as any, comment: comment || null, actedAt: new Date(), deadline: new Date() },
      })
    }
  }

  let newStatus: string | undefined
  if (isRejected) newStatus = "REJECTED"
  else if (isApproval && stage === "HR_ADMIN") newStatus = "APPROVED"

  if (newStatus) {
    await prisma.leaveRequest.update({ where: { id }, data: { status: newStatus as any, updatedAt: new Date() } })
  }

  if (request.employee) {
    const empRole = (request.employee as any).user?.role ?? "STAFF"
    const stageLabel = stage === "HR_ADMIN" ? "HR Admin" : "Project Lead"

    let approvedMessage = ""
    if (isApproval && stage === "HR_ADMIN") {
      // Fetch confirmed relief officers to include in the notification
      const reliefList = await prisma.leaveReliefOfficer.findMany({
        where: { leaveRequestId: id },
        include: { employee: { select: { firstName: true, lastName: true } } },
      })
      const reliefNames = reliefList.map(r => `${r.employee.firstName} ${r.employee.lastName}`)
      const reliefSentence = reliefNames.length > 0
        ? ` ${reliefNames.join(" and ")} will cover your tasks during your absence.`
        : ""
      approvedMessage = `Your ${request.leaveType?.name} leave request has been fully approved.${reliefSentence}${comment ? ` Note: ${comment}` : ""}`
    }

    await prisma.notification.create({
      data: {
        userId: request.employee.userId,
        employeeId: request.employee.id,
        title: isApproval ? (stage === "HR_ADMIN" ? "Leave Request Approved" : "Leave Progressing") : "Leave Request Rejected",
        message: isApproval
          ? stage === "HR_ADMIN"
            ? approvedMessage
            : `Your leave request was approved by a Project Lead and is progressing to HR Admin for final approval.`
          : `Your leave request was rejected by ${stageLabel}.${comment ? ` Reason: ${comment}` : ""}`,
        type: isApproval ? "SUCCESS" : "DANGER",
        link: `${roleBasePath(empRole)}/requests/leave`,
      },
    })
  }

  // After PL approves — check if ALL PLs done, then notify HR Admins only
  if (isApproval && stage === "PROJECT_LEAD") {
    const refreshed = await prisma.leaveApproval.findMany({ where: { leaveRequestId: id, stage: "PROJECT_LEAD" } })
    const allDone = refreshed.length > 0 && refreshed.every(a => a.action && ["APPROVED", "APPROVED_WITH_COMMENT"].includes(a.action as string))
    if (allDone) {
      const hrRecipients = await getHRAdminRecipients()
      for (const hr of hrRecipients) {
        await prisma.notification.create({
          data: {
            userId: hr.userId,
            employeeId: hr.employeeId ?? null,
            title: "Leave — Final Approval Needed",
            message: `${request.employee?.firstName} ${request.employee?.lastName}'s ${request.leaveType?.name} leave has been approved by all Project Leads and awaits your final approval.`,
            type: "WARNING",
            link: `/admin/requests/leave`,
          },
        })
      }
    }
  }

  // After HR Admin approves — create relief records then notify relief officers
  if (isApproval && stage === "HR_ADMIN") {
    let handoverData: any[] = []
    try { handoverData = JSON.parse(request.handoverNotes as string ?? "[]") } catch {}

    // Create relief officer records now (not before, so relief sees nothing until fully approved)
    const uniqueRelief = [...new Map(
      handoverData.filter((h: any) => h.relieverId).map((h: any) => [h.relieverId, h])
    ).values()]
    for (const h of uniqueRelief) {
      const existing = await prisma.leaveReliefOfficer.findFirst({ where: { leaveRequestId: id, employeeId: h.relieverId } })
      if (!existing) {
        await prisma.leaveReliefOfficer.create({
          data: { leaveRequestId: id, employeeId: h.relieverId, status: "ACCEPTED" },
        })
      }
    }

    // Notify all confirmed relief officers
    const reliefList = await prisma.leaveReliefOfficer.findMany({
      where: { leaveRequestId: id },
      include: { employee: { select: { userId: true, user: { select: { role: true } } } } },
    })
    for (const relief of reliefList) {
      const handoverEntries = handoverData.filter((h: any) => h.relieverId === relief.employeeId)
      const taskNames = handoverEntries.map((h: any) => h.taskName).filter(Boolean)
      const taskLabel = taskNames.length > 0 ? ` for task${taskNames.length > 1 ? "s" : ""}: ${taskNames.join(", ")}` : ""
      await prisma.notification.create({
        data: {
          userId: relief.employee.userId,
          employeeId: relief.employeeId,
          title: "Relief Duty Confirmed",
          message: `${request.employee?.firstName} ${request.employee?.lastName}'s ${request.leaveType?.name} leave has been fully approved. You are confirmed as relief officer${taskLabel}.`,
          type: "SUCCESS",
          link: `${roleBasePath((relief.employee.user?.role as string) ?? "STAFF")}/requests/leave?tab=relief`,
        },
      })
    }
  }

  return NextResponse.json({ success: true, stage, action })
}
