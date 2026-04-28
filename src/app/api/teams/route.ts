import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, isAdminRole } from "@/lib/api-auth"

const TEAM_INCLUDE_ADMIN = {
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

const TEAM_INCLUDE_PUBLIC = {
  department: { select: { id: true, name: true } },
  head: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
  members: {
    where: { employeeStatus: "ACTIVE" as const },
    select: {
      id: true, firstName: true, lastName: true, jobTitle: true,
      profilePhoto: true, employeeId: true, employeeStatus: true, category: true,
      department: { select: { name: true } },
    },
  },
}

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const teams = await prisma.team.findMany({
    include: isAdminRole(user.role) ? TEAM_INCLUDE_ADMIN : TEAM_INCLUDE_PUBLIC,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })
  return NextResponse.json({ teams })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminRole(user.role)) return forbidden()

  const { name, category, departmentId, headId, description } = await req.json()
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

  const team = await prisma.team.create({
    data: {
      name,
      category: category ?? "NON_TECHNICAL",
      departmentId: departmentId || null,
      headId: headId || null,
      description: description || null,
    },
    include: TEAM_INCLUDE_ADMIN,
  })
  return NextResponse.json({ team }, { status: 201 })
}
