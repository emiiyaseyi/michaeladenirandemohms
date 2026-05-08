import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { format } from "date-fns"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ error: "Employee profile required" }, { status: 403 })

  const { id } = await params
  const { action, comment } = await req.json() // action: "ACCEPTED" | "DECLINED"

  if (!["ACCEPTED", "DECLINED"].includes(action)) {
    return NextResponse.json({ error: "Action must be ACCEPTED or DECLINED" }, { status: 400 })
  }

  const reliefRecord = await prisma.leaveReliefOfficer.findUnique({
    where: { leaveRequestId_employeeId: { leaveRequestId: id, employeeId: user.employeeId } },
    include: { leaveRequest: { include: { employee: { include: { user: { select: { role: true } } } }, leaveType: true } } },
  })

  if (!reliefRecord) return NextResponse.json({ error: "No relief officer assignment found" }, { status: 404 })
  if (reliefRecord.status !== "PENDING") return NextResponse.json({ error: "Already responded" }, { status: 400 })

  await prisma.leaveReliefOfficer.update({
    where: { id: reliefRecord.id },
    data: {
      status: action as any,
      acceptedAt: action === "ACCEPTED" ? new Date() : null,
      declinedAt: action === "DECLINED" ? new Date() : null,
      comment: comment || null,
    },
  })

  const req_data = reliefRecord.leaveRequest
  const applicant = req_data.employee

  // If relief officer declined, reject the leave request immediately
  if (action === "DECLINED") {
    await prisma.leaveRequest.update({ where: { id }, data: { status: "REJECTED" } })
  }

  // Notify the leave applicant
  const appRole = (applicant as any).user?.role ?? "STAFF"
  const appBase = appRole === "SUPER_ADMIN" ? "/admin" : "/staff"
  await prisma.notification.create({
    data: {
      userId: applicant.userId,
      employeeId: applicant.id,
      title: action === "ACCEPTED" ? "Relief Officer Accepted" : "Relief Officer Declined",
      message: action === "ACCEPTED"
        ? `Your relief officer has accepted the role for your ${req_data.leaveType.name} leave (${format(req_data.startDate, "MMM d")} – ${format(req_data.endDate, "MMM d")}).`
        : `Your relief officer declined. Please update your leave request with a new relief officer.${comment ? ` Reason: ${comment}` : ""}`,
      type: action === "ACCEPTED" ? "SUCCESS" : "WARNING",
      link: `${appBase}/requests/leave`,
    },
  })

  // Check if all relief officers have accepted — if so, move request forward
  const allOfficers = await prisma.leaveReliefOfficer.findMany({ where: { leaveRequestId: id } })
  const allAccepted = allOfficers.every(o => o.status === "ACCEPTED")
  if (allAccepted) {
    // Notify project lead/manager it's their turn
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { approvals: { where: { stage: "PROJECT_LEAD", action: null }, include: { employee: { select: { userId: true, user: { select: { role: true } } } } } } },
    })
    const plApproval = request?.approvals[0]
    if (plApproval?.employee) {
      const tlRole = (plApproval.employee as any).user?.role ?? "STAFF"
      const tlBase = tlRole === "SUPER_ADMIN" ? "/admin" : "/staff"
      await prisma.notification.create({
        data: {
          userId: plApproval.employee.userId,
          employeeId: plApproval.employeeId,
          title: "Leave Request Ready for Review",
          message: `${applicant.firstName} ${applicant.lastName}'s leave request is ready for your approval (all relief officers accepted).`,
          type: "INFO",
          link: `${tlBase}/requests/leave`,
        },
      })
    }
  }

  return NextResponse.json({ success: true, action })
}
