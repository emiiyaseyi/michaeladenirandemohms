import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { EmployeeStatus } from "@prisma/client"

// Statuses visible on the org chart - excludes only people who've actually left.
const VISIBLE_STATUSES: EmployeeStatus[] = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "NEEDS_ATTENTION"]

type FlatEmployee = {
  id: string
  firstName: string
  lastName: string
  profilePhoto: string | null
  jobTitle: string | null
  managerId: string | null
  department: { name: string } | null
}

type TreeEmployee = FlatEmployee & { directReports: TreeEmployee[] }

function buildTree(employees: FlatEmployee[]): TreeEmployee[] {
  const visibleIds = new Set(employees.map(e => e.id))
  const byManager = new Map<string | null, FlatEmployee[]>()
  for (const emp of employees) {
    // Treat as a root if there's no manager, or the manager isn't in the visible
    // set (e.g. terminated) - otherwise this employee's whole subtree would
    // silently vanish instead of just re-parenting to the top level.
    const key = emp.managerId && visibleIds.has(emp.managerId) ? emp.managerId : null
    if (!byManager.has(key)) byManager.set(key, [])
    byManager.get(key)!.push(emp)
  }
  // visited guards against a corrupted manager chain (a cycle) causing infinite recursion.
  function attach(emp: FlatEmployee, visited: Set<string>): TreeEmployee {
    if (visited.has(emp.id)) return { ...emp, directReports: [] }
    const nextVisited = new Set(visited).add(emp.id)
    return { ...emp, directReports: (byManager.get(emp.id) ?? []).map(child => attach(child, nextVisited)) }
  }
  return (byManager.get(null) ?? []).map(emp => attach(emp, new Set()))
}

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewOrgChart")
  if (perm) return perm
  const [departments, employees] = await Promise.all([
    prisma.department.findMany({
      include: {
        division: true,
        _count: { select: { employees: true } },
        employees: { take: 3, select: { id: true, firstName: true, lastName: true, profilePhoto: true, jobTitle: true } }
      },
      orderBy: { name: "asc" }
    }),
    prisma.employee.findMany({
      where: { employeeStatus: { in: VISIBLE_STATUSES } },
      select: {
        id: true, firstName: true, lastName: true, profilePhoto: true, jobTitle: true, managerId: true,
        department: { select: { name: true } },
      },
    }),
  ])
  const roots = buildTree(employees as FlatEmployee[])
  return NextResponse.json({ departments, roots })
}
