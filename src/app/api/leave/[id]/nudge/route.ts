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

  // Fetch base leave info without approvals filter (safe for any stage value)
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      leaveType: { select: { name: true } },
    },
  })

  if (!leaveRequest) return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
  if (leaveRequest.status !== "PENDING") return NextResponse.json({ error: "Leave request is not pending" }, { status: 400 })

  const requesterName = `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName}`
  const leaveName = leaveRequest.leaveType.name

  // Nudge pending relief officers
  if (stage === "RELIEF") {
    const relief = await prisma.leaveReliefOfficer.findMany({
      where: { leaveRequestId: id, status: "PENDING" },
      include: { employee: { select: { id: true, userId: true, user: { select: { role: true } } } } },
    })
    if (relief.length === 0) return NextResponse.json({ error: "No pending relief officers" }, { status: 400 })
    await prisma.notification.createMany({
      data: relief.map(r => ({
        userId: r.employee.userId,
        employeeId: r.employee.id,
        title: "Relief Request Reminder",
        message: `${requesterName} is waiting for your response on their ${leaveName} leave request.`,
        type: "WARNING" as const,
        link: `${roleBasePath((r.employee as any).user?.role ?? "STAFF")}/requests/leave?tab=relief`,
      })),
    })
    return NextResponse.json({ ok: true, nudged: relief.length })
  }

  // Nudge admin: no approval record exists until admin acts, so notify by role
  if (stage === "ADMIN") {
    const admins = await prisma.employee.findMany({
      where: { user: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } },
      select: { id: true, userId: true },
    })
    if (admins.length === 0) return NextResponse.json({ error: "No admin users found" }, { status: 400 })
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.userId,
        employeeId: a.id,
        title: "Leave Approval Reminder",
        message: `${requesterName} is waiting for admin approval on their ${leaveName} leave request.`,
        type: "WARNING" as const,
        link: `${roleBasePath("ADMIN")}/requests/leave?highlight=${id}`,
      })),
    })
    return NextResponse.json({ ok: true, nudged: admins.length })
  }

  // Nudge TEAM_LEAD (approval record created at submission)
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

  return NextResponse.json({ ok: true, nudged: pendingApprovals.length })
}
