import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const c = caps(user.role)
  if (!c.canViewAllEmployees && !c.canManageOnboarding) return forbidden()

  const { id } = await params
  const body = await req.json()
  const { name, description, status, startDate, endDate, leadId, memberIds } = body

  const data: any = {}
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description || null
  if (status !== undefined) data.status = status
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null
  if (leadId !== undefined) data.ownerId = leadId || null

  const project = await prisma.project.update({ where: { id }, data })

  // If members provided, replace all assignments
  if (memberIds !== undefined) {
    await prisma.projectAssignment.deleteMany({ where: { projectId: id } })
    if (memberIds.length > 0 || leadId) {
      await prisma.projectAssignment.createMany({
        data: [
          ...(leadId ? [{ projectId: id, employeeId: leadId, role: "Project Lead" }] : []),
          ...memberIds
            .filter((mid: string) => mid !== leadId)
            .map((mid: string) => ({ projectId: id, employeeId: mid, role: "Member" })),
        ],
        skipDuplicates: true,
      })
    }
  }

  const updated = await prisma.project.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } } },
      },
    },
  })

  return NextResponse.json({ project: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewAllEmployees) return forbidden()

  const { id } = await params
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
