import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

// Page-view access: SUPER_ADMIN OR anyone with at least one admin role.
async function hasAdminPanelAccess(userId: string, role: string): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true
  const count = await prisma.userAdminRole.count({ where: { userId } })
  return count > 0
}

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!(await hasAdminPanelAccess(user.id, user.role))) return forbidden()

  const managers = await prisma.manager.findMany({
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, jobTitle: true,
          profilePhoto: true, employeeId: true,
          department: { select: { name: true } },
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ managers })
}

// Only SUPER_ADMIN can add a manager.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden("Only super admin can add managers")

  const { employeeId } = await req.json()
  if (!employeeId) return NextResponse.json({ error: "employeeId is required" }, { status: 400 })

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: { select: { role: true } }, managerEntry: true },
  })
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  if (employee.managerEntry) return NextResponse.json({ error: "Already a manager" }, { status: 400 })
  if (employee.user.role !== "PROJECT_LEAD") {
    return NextResponse.json({ error: "Only Project Leads can be promoted to Manager" }, { status: 400 })
  }

  const manager = await prisma.manager.create({
    data: { employeeId, isSystem: false },
  })

  const empUser = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } })
  await logAudit({
    req, actor: user, action: "MANAGER_ASSIGN", entity: "Manager", entityId: manager.id,
    targetUserId: empUser?.userId ?? null,
    newValues: { employeeId },
  })

  return NextResponse.json({ manager }, { status: 201 })
}
