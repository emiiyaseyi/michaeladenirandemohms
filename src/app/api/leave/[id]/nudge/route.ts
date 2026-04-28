import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, roleBasePath } from "@/lib/api-auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canApproveLeave && !caps(user.role).canViewAllLeave) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const { stage } = await req.json()

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      leaveType: { select: { name: true } },
      approvals: {
        where: { stage, action: null },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, userId: true, user: { select: { role: true } } },
          },
        },
      },
    },
  })

  if (!leaveRequest) return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
  if (leaveRequest.status !== "PENDING") return NextResponse.json({ error: "Leave request is not pending" }, { status: 400 })

  const pendingApprovals = leaveRequest.approvals
  if (pendingApprovals.length === 0) {
    return NextResponse.json({ error: "No pending approvers at this stage" }, { status: 400 })
  }

  const requesterName = `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName}`

  const notifications = pendingApprovals.map(approval => {
    const approverRole = (approval.employee as any).user?.role ?? "STAFF"
    return {
      userId: approval.employee.userId,
      employeeId: approval.employee.id,
      title: "Leave Approval Reminder",
      message: `${requesterName} is waiting for your approval on their ${leaveRequest.leaveType.name} leave request.`,
      type: "WARNING" as const,
      link: `${roleBasePath(approverRole)}/requests/leave?highlight=${id}`,
    }
  })

  await prisma.notification.createMany({ data: notifications })

  return NextResponse.json({ ok: true, nudged: pendingApprovals.length })
}
