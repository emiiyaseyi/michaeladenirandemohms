import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

// Relief assignments are now info-only - no accept/decline
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ error: "No employee profile" }, { status: 403 })

  const { id } = await params

  const record = await prisma.leaveReliefOfficer.findUnique({
    where: { leaveRequestId_employeeId: { leaveRequestId: id, employeeId: user.employeeId } },
    include: {
      leaveRequest: {
        include: {
          employee: { select: { firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
          leaveType: { select: { name: true } },
        },
      },
    },
  })

  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ record })
}
