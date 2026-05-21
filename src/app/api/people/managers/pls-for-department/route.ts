import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

// Page-view access: SUPER_ADMIN OR anyone with at least one admin role.
async function hasAdminPanelAccess(userId: string, role: string): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true
  const count = await prisma.userAdminRole.count({ where: { userId } })
  return count > 0
}

// Returns PROJECT_LEAD employees assigned to the given department via
// ProjectLeadDepartment, **excluding** anyone who also has a Manager table entry.
// Used by the "Primary Project Lead" picker when creating a STAFF employee.
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!(await hasAdminPanelAccess(user.id, user.role))) return forbidden()

  const departmentId = req.nextUrl.searchParams.get("departmentId")
  if (!departmentId) {
    return NextResponse.json({ error: "departmentId is required" }, { status: 400 })
  }

  // Find users (with userId on ProjectLeadDepartment) for this dept, then their employees,
  // filtering out anyone who is in the Manager table.
  const pls = await prisma.employee.findMany({
    where: {
      user: {
        role: "PROJECT_LEAD",
        projectLeadDepartments: { some: { departmentId } },
      },
      managerEntry: { is: null },
      employeeStatus: { in: ["ACTIVE", "ON_LEAVE"] },
    },
    select: {
      id: true, firstName: true, lastName: true, jobTitle: true,
      profilePhoto: true, employeeId: true,
      user: { select: { email: true } },
    },
    orderBy: { firstName: "asc" },
  })

  return NextResponse.json({ pls })
}
