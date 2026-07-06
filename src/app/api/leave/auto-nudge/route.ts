import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { getDay, getHours } from "date-fns"
import { roleBasePath } from "@/lib/api-auth"
import { requireCronSecret } from "@/lib/cron-auth"

// Called by a scheduler every hour on weekdays.
// Sends in-app notification to pending approvers whose deadline has passed
// if within 8am–6pm window. Silences weekends.
//
// Protect with a shared secret: CRON_SECRET env var.

export async function POST(req: NextRequest) {
  const authError = requireCronSecret(req)
  if (authError) return authError

  const now = new Date()
  const day = getDay(now) // 0=Sun, 6=Sat
  const hour = getHours(now)

  // Only run on weekdays 8am–6pm
  if (day === 0 || day === 6 || hour < 8 || hour >= 18) {
    return NextResponse.json({ ok: true, skipped: "outside window" })
  }

  const overdueApprovals = await prisma.leaveApproval.findMany({
    where: {
      action: null,
      deadline: { lt: now },
      leaveRequest: { status: "PENDING" },
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, userId: true, user: { select: { role: true } } } },
      leaveRequest: {
        include: {
          employee: { select: { firstName: true, lastName: true } },
          leaveType: { select: { name: true } },
        },
      },
    },
  })

  if (overdueApprovals.length === 0) {
    return NextResponse.json({ ok: true, nudged: 0 })
  }

  const notifications = overdueApprovals.map(approval => {
    const requester = `${approval.leaveRequest.employee.firstName} ${approval.leaveRequest.employee.lastName}`
    const leaveTypeName = approval.leaveRequest.leaveType.name
    const approverRole = (approval.employee as any).user?.role ?? "STAFF"
    return {
      userId: approval.employee.userId,
      employeeId: approval.employee.id,
      title: "Leave Approval Overdue",
      message: `Your approval is overdue for ${requester}'s ${leaveTypeName} leave request. Please review and take action.`,
      type: "WARNING" as const,
      link: `${roleBasePath(approverRole)}/requests/leave?highlight=${approval.leaveRequestId}`,
    }
  })

  await prisma.notification.createMany({ data: notifications })

  for (const approval of overdueApprovals) {
    sendEmail({ eventKey: "leave_auto_nudge", toUserId: approval.employee.userId, variables: { requesterName: `${approval.leaveRequest.employee.firstName} ${approval.leaveRequest.employee.lastName}`, leaveType: approval.leaveRequest.leaveType.name } }).catch(() => {})
  }

  return NextResponse.json({ ok: true, nudged: overdueApprovals.length })
}
