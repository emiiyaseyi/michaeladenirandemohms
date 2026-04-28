import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { format } from "date-fns"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ error: "No employee profile" }, { status: 403 })

  const { id } = await params
  const { action, comment } = await req.json()

  if (!["ACCEPTED", "DECLINED"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const assignment = await prisma.leaveReliefOfficer.findUnique({
    where: { id },
    include: {
      leaveRequest: {
        include: {
          employee: { select: { userId: true, firstName: true, lastName: true } },
          leaveType: { select: { name: true } },
        },
      },
    },
  })

  if (!assignment) return NextResponse.json({ error: "Relief assignment not found" }, { status: 404 })
  if (assignment.employeeId !== user.employeeId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  }
  if (assignment.status !== "PENDING") {
    return NextResponse.json({ error: "Already responded" }, { status: 400 })
  }

  const now = new Date()
  await prisma.leaveReliefOfficer.update({
    where: { id },
    data: {
      status: action as "ACCEPTED" | "DECLINED",
      comment: comment || null,
      acceptedAt: action === "ACCEPTED" ? now : undefined,
      declinedAt: action === "DECLINED" ? now : undefined,
    },
  })

  // Update the RELIEF_OFFICER approval stage
  const reliefApproval = await prisma.leaveApproval.findFirst({
    where: { leaveRequestId: assignment.leaveRequestId, stage: "TEAM_LEAD", action: null },
  })
  if (reliefApproval) {
    await prisma.leaveApproval.update({
      where: { id: reliefApproval.id },
      data: {
        action: action === "ACCEPTED" ? "ACCEPTED" : "REJECTED",
        comment: comment || null,
        actedAt: now,
        employeeId: user.employeeId,
      },
    })
  }

  // If declined, reject the leave request and notify applicant
  if (action === "DECLINED") {
    await prisma.leaveRequest.update({
      where: { id: assignment.leaveRequestId },
      data: { status: "REJECTED" },
    })
  }

  // Notify the applicant
  const req2 = assignment.leaveRequest
  if (req2.employee) {
    const leaveName = req2.leaveType?.name ?? "leave"
    const responderName = `${user.name ?? "A relief officer"}`
    await prisma.notification.create({
      data: {
        userId: req2.employee.userId,
        employeeId: req2.employeeId,
        title: action === "ACCEPTED" ? "Relief Officer Accepted" : "Relief Officer Declined",
        message: action === "ACCEPTED"
          ? `${responderName} has accepted to be your relief officer for your ${leaveName} request.`
          : `${responderName} has declined to be your relief officer for your ${leaveName} request. Your request has been put on hold.`,
        type: action === "ACCEPTED" ? "SUCCESS" : "DANGER",
        link: "/leave",
      },
    })
  }

  return NextResponse.json({ ok: true })
}
