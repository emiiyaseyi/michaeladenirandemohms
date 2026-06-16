import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "PROJECT_LEAD") return forbidden("Project Lead only")

  const { id } = await params
  const { employeeId, projectRole } = await req.json()
  if (!employeeId) return NextResponse.json({ error: "employeeId is required" }, { status: 400 })

  const plEmployee = await prisma.employee.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!plEmployee) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const project = await prisma.project.findUnique({ where: { id }, select: { leadId: true, name: true } })
  if (!project || project.leadId !== plEmployee.id) {
    return NextResponse.json({ error: "Not found or not your project" }, { status: 404 })
  }

  // Employee must be in one of PL's departments
  const plDepts = await prisma.projectLeadDepartment.findMany({
    where: { userId: user.id },
    select: { departmentId: true },
  })
  const deptIds = plDepts.map(d => d.departmentId)
  const target = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, departmentId: true, userId: true, firstName: true, lastName: true },
  })
  if (!target) return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  if (!target.departmentId || !deptIds.includes(target.departmentId)) {
    return NextResponse.json({ error: "Employee is not in your team" }, { status: 400 })
  }

  const member = await prisma.projectMember.create({
    data: { projectId: id, employeeId, projectRole: projectRole?.trim() || null },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, jobTitle: true,
          profilePhoto: true, employeeId: true, employeeStatus: true,
        },
      },
    },
  })

  // Notify the staff member
  if (target.userId) {
    await prisma.notification.create({
      data: {
        userId: target.userId,
        title: "Added to Project",
        message: `You have been added to ${project.name}.`,
        type: "INFO",
        link: "/staff/projects",
      },
    }).catch(() => {})
  }

  return NextResponse.json({ member }, { status: 201 })
}
