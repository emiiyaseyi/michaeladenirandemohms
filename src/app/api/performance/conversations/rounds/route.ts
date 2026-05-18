import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const mine = req.nextUrl.searchParams.get("mine") === "true"
  const isAdmin = user.role === "SUPER_ADMIN" || user.permissions["canManageConversations"]

  let where: any = {}

  if (mine || user.role === "STAFF") {
    if (!user.employeeId) return NextResponse.json({ rounds: [] })
    where["setup"] = { employeeId: user.employeeId }
  } else if (user.role === "PROJECT_LEAD" && !isAdmin) {
    // PL sees their team's rounds
    const team = await prisma.employee.findMany({
      where: { projectLeadId: user.employeeId },
      select: { id: true },
    })
    const teamIds = team.map(e => e.id)
    if (user.employeeId) teamIds.push(user.employeeId)
    where["setup"] = { employeeId: { in: teamIds } }
  } else if (!isAdmin) {
    return NextResponse.json({ rounds: [] })
  }

  try {
    const rounds = await prisma.conversationRound.findMany({
      where,
      include: {
        setup: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { scheduledDate: "desc" },
    })
    return NextResponse.json({ rounds })
  } catch {
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 })
  }
}
