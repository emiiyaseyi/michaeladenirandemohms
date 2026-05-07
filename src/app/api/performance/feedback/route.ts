import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeIds = searchParams.getAll("employeeId")
  const direction = searchParams.get("direction") ?? "given"

  const where: any = {}
  if (employeeIds.length > 0) {
    if (direction === "received") {
      where.receiverId = { in: employeeIds }
    } else {
      where.giverId = { in: employeeIds }
    }
  }

  const feedbacks = await prisma.feedback.findMany({
    where,
    include: {
      giver: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ feedbacks })
}
