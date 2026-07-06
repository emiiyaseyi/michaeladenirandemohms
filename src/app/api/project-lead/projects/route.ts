import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "PROJECT_LEAD") return forbidden("Project Lead only")

  const plDepts = await prisma.projectLeadDepartment.findMany({
    where: { userId: user.id },
    select: { departmentId: true },
  })
  const deptIds = plDepts.map(d => d.departmentId)

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })
  if (!employee) return NextResponse.json({ projects: [] })

  const projects = await prisma.project.findMany({
    where: { leadId: employee.id, deletedAt: null },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ projects, deptIds })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "PROJECT_LEAD") return forbidden("Project Lead only")

  const { name, description, departmentId, startDate, endDate } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Project name is required" }, { status: 400 })
  if (!departmentId) return NextResponse.json({ error: "Department is required" }, { status: 400 })

  // Verify the PL leads this department
  const plDept = await prisma.projectLeadDepartment.findFirst({
    where: { userId: user.id, departmentId },
  })
  if (!plDept) return NextResponse.json({ error: "You do not lead this department" }, { status: 403 })

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })
  if (!employee) return NextResponse.json({ error: "Employee record not found" }, { status: 404 })

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      departmentId,
      leadId: employee.id,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  })

  return NextResponse.json({ project }, { status: 201 })
}
