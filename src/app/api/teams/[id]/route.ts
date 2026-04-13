import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

const TEAM_INCLUDE = {
  department: { select: { id: true, name: true } },
  head: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
  members: {
    where: { employeeStatus: "ACTIVE" as const },
    select: {
      id: true, firstName: true, lastName: true, jobTitle: true,
      profilePhoto: true, employeeId: true, employeeStatus: true, category: true,
      department: { select: { name: true } },
      user: { select: { role: true } },
    },
  },
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && user.role !== "HR_ADMIN" && user.role !== "ADMIN") return forbidden()

  const { id } = await params
  const { name, category, departmentId, headId, description, addMemberId, removeMemberId } = await req.json()

  // Add / remove a member
  if (addMemberId) {
    await prisma.employee.update({ where: { id: addMemberId }, data: { teamId: id } })
    const team = await prisma.team.findUnique({ where: { id }, include: TEAM_INCLUDE })
    return NextResponse.json({ team })
  }
  if (removeMemberId) {
    await prisma.employee.update({ where: { id: removeMemberId }, data: { teamId: null } })
    const team = await prisma.team.findUnique({ where: { id }, include: TEAM_INCLUDE })
    return NextResponse.json({ team })
  }

  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(departmentId !== undefined && { departmentId: departmentId || null }),
      ...(headId !== undefined && { headId: headId || null }),
      ...(description !== undefined && { description: description || null }),
    },
    include: TEAM_INCLUDE,
  })
  return NextResponse.json({ team })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { id } = await params
  // Remove team assignment from all members first
  await prisma.employee.updateMany({ where: { teamId: id }, data: { teamId: null } })
  await prisma.team.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
