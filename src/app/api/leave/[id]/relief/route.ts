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
    include: { leaveRequest: { include: { employee: true, leaveType: true } } },
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

  // Also update the leave approval record for this stage
  await prisma.leaveApproval.updateMany({
    where: { leaveRequestId: id, stage: "RELIEF_OFFICER", action: null },
    data: { action: action === "ACCEPTED" ? "ACCEPTED" : "REJECTED", actedAt: new Date(), comment: comment || null },
  })

  const req_data = reliefRecord.leaveRequest
  const applicant = req_data.employee

  // Notify the leave applicant
  await prisma.notification.create({
    data: {
      userId: applicant.userId,
      employeeId: applicant.id,
      title: action === "ACCEPTED" ? "Relief Officer Accepted" : "Relief Officer Declined",
      message: action === "ACCEPTED"
        ? `Your relief officer has accepted the role for your ${req_data.leaveType.name} leave (${format(req_data.startDate, "MMM d")} – ${format(req_data.endDate, "MMM d")}).`
        : `Your relief officer declined. Please update your leave request with a new relief officer.${comment ? ` Reason: ${comment}` : ""}`,
      type: action === "ACCEPTED" ? "SUCCESS" : "WARNING",
      link: "/leave",
    },
  })

  // Check if all relief officers have accepted — if so, move request forward
  const allOfficers = await prisma.leaveReliefOfficer.findMany({ where: { leaveRequestId: id } })
  const allAccepted = allOfficers.every(o => o.status === "ACCEPTED")
  if (allAccepted) {
    // Notify team lead/manager it's their turn
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { approvals: { where: { stage: "TEAM_LEAD", action: null }, include: { employee: { select: { userId: true } } } } },
    })
    const teamLeadApproval = request?.approvals[0]
    if (teamLeadApproval?.employee) {
      await prisma.notification.create({
        data: {
          userId: teamLeadApproval.employee.userId,
          employeeId: teamLeadApproval.employeeId,
          title: "Leave Request Ready for Review",
          message: `${applicant.firstName} ${applicant.lastName}'s leave request is ready for your approval (all relief officers accepted).`,
          type: "INFO",
          link: "/leave",
        },
      })
    }
  }

  return NextResponse.json({ success: true, action })
}
