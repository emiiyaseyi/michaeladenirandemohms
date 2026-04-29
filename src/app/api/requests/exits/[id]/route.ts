import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden, roleBasePath } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageOffboarding) return forbidden()

  const { id } = await params
  const { action, declineReason } = await req.json()

  if (!["APPROVE", "DECLINE"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const exitReq = await prisma.exitRequest.findUnique({
    where: { id },
    include: { employee: { select: { id: true, userId: true, firstName: true, lastName: true, user: { select: { role: true } } } } },
  })

  if (!exitReq) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (exitReq.status !== "PENDING") return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 })

  const now = new Date()

  if (action === "APPROVE") {
    // Check if offboarding already exists
    const existing = await prisma.offboarding.findUnique({ where: { employeeId: exitReq.employeeId } })
    if (existing) return NextResponse.json({ error: "Offboarding already exists for this employee" }, { status: 409 })

    const [, ob] = await Promise.all([
      prisma.exitRequest.update({
        where: { id },
        data: { status: "APPROVED", reviewedById: user.id, reviewedAt: now },
      }),
      prisma.offboarding.create({
        data: {
          employeeId: exitReq.employeeId,
          exitType: exitReq.exitType,
          lastWorkingDay: exitReq.intendedLastDay,
          reason: exitReq.reason ?? undefined,
          status: "INITIATED",
          tasks: {
            create: [
              { title: "Asset Return",                category: "ADMIN",    assignedTo: "Admin" },
              { title: "Access Revocation",           category: "IT",       assignedTo: "IT" },
              { title: "Final Salary Processing",     category: "FINANCE",  assignedTo: "Finance" },
              { title: "Knowledge Transfer Document", category: "ADMIN",    assignedTo: "Line Manager" },
              { title: "HR Documentation",            category: "HR",       assignedTo: "HR Admin" },
            ],
          },
        },
        include: { tasks: true },
      }),
    ])

    const empBase = roleBasePath((exitReq.employee as any).user?.role ?? "STAFF")
    await prisma.notification.create({
      data: {
        userId: exitReq.employee.userId,
        employeeId: exitReq.employeeId,
        title: "Exit Request Approved",
        message: "Your exit request has been approved and your offboarding process has been initiated. Please review your offboarding checklist.",
        type: "SUCCESS",
        link: `${empBase}/self-service/exit`,
      },
    })

    return NextResponse.json({ offboarding: ob })
  }

  // DECLINE
  if (!declineReason?.trim()) {
    return NextResponse.json({ error: "A reason is required to decline" }, { status: 400 })
  }

  await prisma.exitRequest.update({
    where: { id },
    data: { status: "DECLINED", reviewedById: user.id, reviewedAt: now, declineReason: declineReason.trim() },
  })

  await prisma.notification.create({
    data: {
      userId: exitReq.employee.userId,
      employeeId: exitReq.employeeId,
      title: "Exit Request Declined",
      message: `Your exit request has been reviewed and declined. Reason: ${declineReason.trim()}`,
      type: "DANGER",
      link: "",
    },
  })

  return NextResponse.json({ success: true })
}
