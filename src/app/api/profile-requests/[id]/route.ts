import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { requireAuth, caps, forbidden, roleBasePath } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewAllEmployees) return forbidden()

  const { id } = await params
  const { action, reviewNote } = await req.json() // action: "approve" | "reject"

  const req_ = await prisma.profileUpdateRequest.findUnique({
    where: { id },
    include: { employee: { select: { id: true, firstName: true, lastName: true, userId: true, user: { select: { role: true } } } } },
  })
  if (!req_) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (req_.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 409 })

  const empRole = (req_.employee as any).user?.role ?? "STAFF"
  const empBase = roleBasePath(empRole)

  if (action === "approve") {
    const changes = req_.changes as Record<string, any>
    await prisma.employee.update({ where: { id: req_.employeeId }, data: changes })

    await prisma.profileUpdateRequest.update({
      where: { id },
      data: { status: "APPROVED", reviewedBy: user.id, reviewNote: reviewNote || null, reviewedAt: new Date() },
    })

    await prisma.notification.create({
      data: {
        userId: req_.employee.userId,
        employeeId: req_.employeeId,
        title: "Profile Update Approved",
        message: "Your profile update request has been approved and your profile has been updated.",
        type: "SUCCESS",
        link: `${empBase}/self-service/profile`,
      },
    })
    sendEmail({ eventKey: "profile_update_approved", toUserId: req_.employee.userId, variables: { employeeName: `${req_.employee.firstName ?? ""} ${req_.employee.lastName ?? ""}` } }).catch(() => {})
  } else {
    await prisma.profileUpdateRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewedBy: user.id, reviewNote: reviewNote || null, reviewedAt: new Date() },
    })

    await prisma.notification.create({
      data: {
        userId: req_.employee.userId,
        employeeId: req_.employeeId,
        title: "Profile Update Not Approved",
        message: `Your profile update request was not approved.${reviewNote ? ` Reason: ${reviewNote}` : ""}`,
        type: "WARNING",
        link: `${empBase}/self-service/edit`,
      },
    })
    sendEmail({ eventKey: "profile_update_rejected", toUserId: req_.employee.userId, variables: { employeeName: `${req_.employee.firstName ?? ""} ${req_.employee.lastName ?? ""}`, reason: reviewNote ?? "" } }).catch(() => {})
  }

  const updated = await prisma.profileUpdateRequest.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, jobTitle: true, profilePhoto: true, department: { select: { name: true } } } },
      reviewer: { select: { name: true } },
    },
  })
  return NextResponse.json({ request: updated })
}
