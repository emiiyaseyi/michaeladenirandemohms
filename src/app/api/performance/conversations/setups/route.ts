import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = user.role === "SUPER_ADMIN" || user.permissions["canManageConversations"]
  let where: any = {}

  if (user.role === "PROJECT_LEAD" && !isAdmin) {
    // PL sees their team + their own setups
    const team = await prisma.employee.findMany({
      where: { projectLeadId: user.employeeId },
      select: { id: true },
    })
    const teamIds = team.map(e => e.id)
    if (user.employeeId) teamIds.push(user.employeeId)
    where.employeeId = { in: teamIds }
  } else if (!isAdmin) {
    return forbidden()
  }

  try {
    const setups = await prisma.conversationSetup.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        rounds: { orderBy: { scheduledDate: "desc" }, take: 1, select: { scheduledDate: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ setups })
  } catch {
    return NextResponse.json({ error: "Failed to fetch setups" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = user.role === "SUPER_ADMIN" || user.permissions["canManageConversations"]
  const isPL = user.role === "PROJECT_LEAD"
  if (!isAdmin && !isPL) return forbidden()

  try {
    const body = await req.json()
    const { employeeId, conversationWith, scheduledDate, startTime, endTime, frequency, conversationType } = body

    if (isPL && !isAdmin && user.employeeId) {
      // Validate PL can only create setups for their own team members
      const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { projectLeadId: true } })
      if (!emp || emp.projectLeadId !== user.employeeId) {
        return forbidden("You can only create setups for your team members")
      }
    }

    const setup = await prisma.conversationSetup.create({
      data: {
        employeeId,
        conversationWith,
        scheduledDate: new Date(scheduledDate),
        startTime,
        endTime,
        frequency: frequency ?? "ONE_OFF",
        conversationType: conversationType ?? "OTHER",
        rounds: {
          create: {
            scheduledDate: new Date(scheduledDate),
            startTime,
            endTime,
            conversationType: conversationType ?? "OTHER",
            status: "OTHER",
          },
        },
      },
    })

    const targetEmp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } })
    await logAudit({
      req: req as any, actor: user, action: "CONVERSATION_SETUP_CREATE", entity: "ConversationSetup", entityId: setup.id,
      targetUserId: targetEmp?.userId ?? null,
      newValues: { employeeId, conversationWith, conversationType, frequency, scheduledDate },
    })

    return NextResponse.json({ setup }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create setup" }, { status: 500 })
  }
}
