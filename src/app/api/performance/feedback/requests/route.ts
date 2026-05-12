import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeIds = searchParams.getAll("employeeId")
  const direction = searchParams.get("direction") ?? "requested"

  const where: any = {}
  if (employeeIds.length > 0) {
    if (direction === "received") {
      where.targetId = { in: employeeIds }
    } else {
      where.requesterId = { in: employeeIds }
    }
  }

  const requests = await prisma.feedbackRequest.findMany({
    where,
    include: {
      requester: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
      target: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ requests })
}
