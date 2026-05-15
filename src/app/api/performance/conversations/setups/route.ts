import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageConversations")
  if (perm) return perm

  try {
    const setups = await prisma.conversationSetup.findMany({
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
  const { user: u2, error: e2 } = await requireAuth()
  if (e2) return e2
  const p2 = requirePermission(u2, "canManageConversations")
  if (p2) return p2

  try {
    const body = await req.json()
    const { employeeId, conversationWith, scheduledDate, startTime, endTime, frequency, conversationType } = body
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
    return NextResponse.json({ setup }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create setup" }, { status: 500 })
  }
}
