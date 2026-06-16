import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "PROJECT_LEAD") return forbidden("Project Lead only")

  const { id, memberId } = await params

  const plEmployee = await prisma.employee.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!plEmployee) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const project = await prisma.project.findUnique({ where: { id }, select: { leadId: true, name: true } })
  if (!project || project.leadId !== plEmployee.id) {
    return NextResponse.json({ error: "Not found or not your project" }, { status: 404 })
  }

  const member = await prisma.projectMember.findUnique({
    where: { id: memberId },
    include: { employee: { select: { userId: true, firstName: true, lastName: true } } },
  })
  if (!member || member.projectId !== id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  await prisma.projectMember.delete({ where: { id: memberId } })

  // Notify the removed staff member
  if (member.employee.userId) {
    await prisma.notification.create({
      data: {
        userId: member.employee.userId,
        title: "Removed from Project",
        message: `You have been removed from ${project.name}.`,
        type: "INFO",
        link: "/staff/projects",
      },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
