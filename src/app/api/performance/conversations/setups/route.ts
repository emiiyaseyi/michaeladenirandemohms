import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
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
