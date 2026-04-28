import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!["ADMIN", "ADMIN", "ADMIN"].includes(user.role)) return forbidden()

  const { id } = await params
  const { action, reviewNote } = await req.json() // action: "approve" | "reject"

  const req_ = await prisma.profileUpdateRequest.findUnique({
    where: { id },
    include: { employee: { select: { id: true, firstName: true, lastName: true, userId: true } } },
  })
  if (!req_) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (req_.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 409 })

  if (action === "approve") {
    // Apply the changes to the employee profile
    const changes = req_.changes as Record<string, any>
    await prisma.employee.update({ where: { id: req_.employeeId }, data: changes })

    await prisma.profileUpdateRequest.update({
      where: { id },
      data: { status: "APPROVED", reviewedBy: user.id, reviewNote: reviewNote || null, reviewedAt: new Date() },
    })

    // Notify the employee
    await prisma.notification.create({
      data: {
        userId: req_.employee.userId,
        employeeId: req_.employeeId,
        title: "Profile Update Approved",
        message: "Your profile update request has been approved and your profile has been updated.",
        type: "SUCCESS",
        link: "/self-service/profile",
      },
    })
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
        link: "/self-service/edit",
      },
    })
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
