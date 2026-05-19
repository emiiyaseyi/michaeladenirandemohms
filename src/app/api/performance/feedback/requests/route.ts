import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

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

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return forbidden("No employee linked to this account")

  const { targetId, message } = await req.json()
  if (!targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 })
  if (targetId === user.employeeId) return NextResponse.json({ error: "Cannot request feedback from yourself" }, { status: 400 })

  const target = await prisma.employee.findUnique({ where: { id: targetId } })
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 })

  const request = await prisma.feedbackRequest.create({
    data: { requesterId: user.employeeId, targetId, message: message ?? null },
    include: {
      requester: { select: { id: true, firstName: true, lastName: true } },
      target: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  const tgtUser = await prisma.employee.findUnique({ where: { id: targetId }, select: { userId: true } })
  await logAudit({
    req: req as any, actor: user, action: "FEEDBACK_REQUEST", entity: "FeedbackRequest", entityId: request.id,
    targetUserId: tgtUser?.userId ?? null,
    newValues: { message },
  })

  return NextResponse.json({ request }, { status: 201 })
}
