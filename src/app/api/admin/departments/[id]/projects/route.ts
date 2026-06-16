import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions["canViewAllEmployees"]) {
    return forbidden("Admins only")
  }

  const { id } = await params

  const projects = await prisma.project.findMany({
    where: { departmentId: id },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { members: true } },
      members: {
        include: {
          employee: {
            select: {
              id: true, firstName: true, lastName: true, jobTitle: true,
              profilePhoto: true, employeeId: true,
            },
          },
        },
        orderBy: { assignedAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ projects })
}
