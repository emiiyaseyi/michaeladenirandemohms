import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden, roleBasePath } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageOffboarding) return forbidden()

  const { taskId } = await params

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: {
      offboarding: {
        include: {
          tasks: true,
          employee: {
            select: {
              id: true, userId: true, firstName: true, lastName: true,
              user: { select: { role: true } },
            },
          },
        },
      },
    },
  })

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

  const newStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED"

  await prisma.offboardingTask.update({
    where: { id: taskId },
    data: { status: newStatus as any, completedAt: newStatus === "COMPLETED" ? new Date() : null },
  })

  // Check if all tasks are now done
  const allTasks = task.offboarding.tasks.map(t =>
    t.id === taskId ? { ...t, status: newStatus } : t
  )
  const allDone = allTasks.every(t => t.status === "COMPLETED")

  if (allDone) {
    const finalStatus = task.offboarding.exitType === "RESIGNATION" ? "RESIGNED"
      : task.offboarding.exitType === "RETIREMENT" ? "RESIGNED"
      : "TERMINATED"

    await Promise.all([
      prisma.offboarding.update({
        where: { id: task.offboardingId },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
      prisma.employee.update({
        where: { id: task.offboarding.employee.id },
        data: { employeeStatus: finalStatus as any },
      }),
    ])

    const emp = task.offboarding.employee
    const empBase = roleBasePath((emp as any).user?.role ?? "STAFF")
    await prisma.notification.create({
      data: {
        userId: emp.userId,
        employeeId: emp.id,
        title: "Offboarding Complete",
        message: "All offboarding tasks have been completed and signed off by HR.",
        type: "SUCCESS",
        link: `${empBase}/self-service/exit`,
      },
    })
  } else if (newStatus === "COMPLETED") {
    // Update status to IN_PROGRESS if it was just INITIATED
    if (task.offboarding.status === "INITIATED") {
      await prisma.offboarding.update({
        where: { id: task.offboardingId },
        data: { status: "IN_PROGRESS" },
      })
    }
  }

  const updated = await prisma.offboarding.findUnique({
    where: { id: task.offboardingId },
    include: {
      employee: { select: { firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
      tasks: { orderBy: { createdAt: "asc" } },
    },
  })

  return NextResponse.json({ offboarding: updated })
}
