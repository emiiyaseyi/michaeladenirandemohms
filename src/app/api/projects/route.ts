import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden, requirePermission } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewProjects")
  if (perm) return perm

  const status = req.nextUrl.searchParams.get("status") ?? ""
  const search = req.nextUrl.searchParams.get("search") ?? ""

  const projects = await prisma.project.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      assignments: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const employees = await prisma.employee.findMany({
    where: { employeeStatus: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true },
    orderBy: { firstName: "asc" },
  })

  return NextResponse.json({ projects, employees })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)
  if (!c.canViewAllEmployees && !c.canManageOnboarding) {
    return forbidden("Insufficient permissions to create projects")
  }

  const body = await req.json()
  const { name, description, startDate, endDate, memberIds = [], leadId } = body

  if (!name?.trim()) return NextResponse.json({ error: "Project name is required" }, { status: 400 })

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description || null,
      ownerId: leadId || user.employeeId || null,
      status: "ACTIVE",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      assignments: {
        create: [
          // Lead gets LEAD role
          ...(leadId ? [{ employeeId: leadId, role: "Project Lead" }] : []),
          // Other members
          ...memberIds
            .filter((id: string) => id !== leadId)
            .map((id: string) => ({ employeeId: id, role: "Member" })),
        ],
      },
    },
    include: {
      assignments: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } } },
      },
    },
  })

  return NextResponse.json({ project }, { status: 201 })
}
