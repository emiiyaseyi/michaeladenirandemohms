import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

async function getProjectAndVerifyOwner(id: string, userId: string) {
  const employee = await prisma.employee.findUnique({ where: { userId }, select: { id: true } })
  if (!employee) return { project: null, employee: null }
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project || project.deletedAt) return { project: null, employee }
  if (project.leadId !== employee.id) return { project: null, employee }
  return { project, employee }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "PROJECT_LEAD") return forbidden("Project Lead only")

  const { id } = await params
  const employee = await prisma.employee.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
      members: {
        include: {
          employee: {
            select: {
              id: true, firstName: true, lastName: true, jobTitle: true,
              profilePhoto: true, employeeId: true, employeeStatus: true,
            },
          },
        },
        orderBy: { assignedAt: "asc" },
      },
    },
  })
  if (!project || project.deletedAt || project.leadId !== employee.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ project })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "PROJECT_LEAD") return forbidden("Project Lead only")

  const { id } = await params
  const { project, employee } = await getProjectAndVerifyOwner(id, user.id)
  if (!project || !employee) return NextResponse.json({ error: "Not found or not your project" }, { status: 404 })

  const { name, description, status, startDate, endDate } = await req.json()

  const oldStatus = project.status
  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(status !== undefined && { status }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    },
    include: {
      department: { select: { id: true, name: true } },
      members: { select: { employeeId: true, employee: { select: { userId: true } } } },
    },
  })

  // Notify all members when status changes to a terminal/notable state
  if (status && status !== oldStatus && status !== "ACTIVE") {
    const statusLabel: Record<string, string> = {
      ON_HOLD: "On Hold",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    }
    const label = statusLabel[status] ?? status
    for (const m of updated.members) {
      if (!m.employee.userId) continue
      await prisma.notification.create({
        data: {
          userId: m.employee.userId,
          title: "Project Status Updated",
          message: `${updated.name} has been marked as ${label}.`,
          type: "INFO",
          link: "/staff/projects",
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ project: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "PROJECT_LEAD") return forbidden("Project Lead only")

  const { id } = await params
  const { project } = await getProjectAndVerifyOwner(id, user.id)
  if (!project) return NextResponse.json({ error: "Not found or not your project" }, { status: 404 })

  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
