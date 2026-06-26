import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { requireAuth, roleBasePath } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

async function getHRAdminRecipients(): Promise<{ userId: string; employeeId?: string }[]> {
  const [superAdmins, assignments] = await Promise.all([
    prisma.user.findMany({ where: { role: "SUPER_ADMIN", isActive: true }, select: { id: true, employee: { select: { id: true } } } }),
    prisma.userAdminRole.findMany({
      include: { adminRole: { select: { permissions: true } }, user: { select: { id: true, isActive: true, employee: { select: { id: true } } } } },
    }),
  ])
  const permsMap = new Map<string, Record<string, boolean>>()
  const infoMap = new Map<string, { employeeId?: string }>()
  for (const { user: u, adminRole } of assignments) {
    if (!u.isActive) continue
    const merged = permsMap.get(u.id) ?? {}
    for (const [k, v] of Object.entries(adminRole.permissions as Record<string, boolean>)) if (v) merged[k] = true
    permsMap.set(u.id, merged)
    infoMap.set(u.id, { employeeId: u.employee?.id })
  }
  const out = new Map<string, { userId: string; employeeId?: string }>()
  for (const u of superAdmins) out.set(u.id, { userId: u.id, employeeId: u.employee?.id })
  for (const [id, perms] of permsMap.entries()) {
    if (perms["canApproveLeave"] && perms["canViewAllLeave"]) out.set(id, { userId: id, employeeId: infoMap.get(id)?.employeeId })
  }
  return [...out.values()]
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.permissions["canApproveLeave"] && !user.permissions["canViewAllLeave"] && user.role !== "SUPER_ADMIN" && user.role !== "PROJECT_LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const { stage } = await req.json()

  // Fetch base leave info without approvals filter (safe for any stage value)
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true, userId: true } },
      leaveType: { select: { name: true } },
    },
  })

  if (!leaveRequest) return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
  if (leaveRequest.status !== "PENDING") return NextResponse.json({ error: "Leave request is not pending" }, { status: 400 })

  const requesterName = `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName}`
  const leaveName = leaveRequest.leaveType.name

  // Nudge HR Admin - use proper recipient lookup (not employee record)
  if (stage === "HR_ADMIN") {
    const hrRecipients = await getHRAdminRecipients()
    if (hrRecipients.length === 0) return NextResponse.json({ error: "No HR Admin found" }, { status: 400 })
    await prisma.notification.createMany({
      data: hrRecipients.map(r => ({
        userId: r.userId,
        employeeId: r.employeeId ?? null,
        title: "Leave Approval Reminder",
        message: `${requesterName} is waiting for final HR approval on their ${leaveName} leave request.`,
        type: "WARNING" as const,
        link: `/admin/requests/leave?highlight=${id}`,
      })),
    })
    for (const r of hrRecipients) {
      sendEmail({ eventKey: "leave_nudge_hr", toUserId: r.userId, variables: { requesterName, leaveType: leaveName } }).catch(() => {})
    }
    await logAudit({ req, actor: user, action: "LEAVE_NUDGE", entity: "LeaveRequest", entityId: id, targetUserId: leaveRequest.employee.userId, newValues: { stage: "HR_ADMIN", nudged: hrRecipients.length } })
    return NextResponse.json({ ok: true, nudged: hrRecipients.length })
  }

  // Nudge PROJECT_LEAD (approval record created at submission)
  const pendingApprovals = await prisma.leaveApproval.findMany({
    where: { leaveRequestId: id, stage: stage as any, action: null },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, userId: true, user: { select: { role: true } } },
      },
    },
  })

  if (pendingApprovals.length === 0) {
    return NextResponse.json({ error: "No pending approvers at this stage" }, { status: 400 })
  }

  const notifications = pendingApprovals.map(approval => {
    const approverRole = (approval.employee as any).user?.role ?? "STAFF"
    return {
      userId: approval.employee.userId,
      employeeId: approval.employee.id,
      title: "Leave Approval Reminder",
      message: `${requesterName} is waiting for your approval on their ${leaveName} leave request.`,
      type: "WARNING" as const,
      link: `${roleBasePath(approverRole)}/requests/leave?highlight=${id}`,
    }
  })

  await prisma.notification.createMany({ data: notifications })

  for (const approval of pendingApprovals) {
    sendEmail({ eventKey: "leave_nudge_pl", toUserId: approval.employee.userId, variables: { requesterName, leaveType: leaveName } }).catch(() => {})
  }

  await logAudit({ req, actor: user, action: "LEAVE_NUDGE", entity: "LeaveRequest", entityId: id, targetUserId: leaveRequest.employee.userId, newValues: { stage, nudged: pendingApprovals.length } })

  return NextResponse.json({ ok: true, nudged: pendingApprovals.length })
}
