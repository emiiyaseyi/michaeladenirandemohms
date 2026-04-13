import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { format } from "date-fns"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ assignments: [] })

  const assignments = await prisma.leaveReliefOfficer.findMany({
    where: { employeeId: user.employeeId },
    include: {
      leaveRequest: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true, departmentId: true, department: { select: { name: true } } },
          },
          leaveType: { select: { id: true, name: true } },
          approvals: { orderBy: { createdAt: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ assignments })
}
