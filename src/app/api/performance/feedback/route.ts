import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

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

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return forbidden("No employee linked to this account")

  const { receiverId, type, comment, rating, isAnonymous } = await req.json()
  if (!receiverId) return NextResponse.json({ error: "receiverId is required" }, { status: 400 })
  if (receiverId === user.employeeId) return NextResponse.json({ error: "Cannot give feedback to yourself" }, { status: 400 })

  const receiver = await prisma.employee.findUnique({ where: { id: receiverId } })
  if (!receiver) return NextResponse.json({ error: "Receiver not found" }, { status: 404 })

  const feedbackType = type ?? (user.role === "PROJECT_LEAD" ? "MANAGER" : "PEER")

  const feedback = await prisma.feedback.create({
    data: {
      giverId: user.employeeId,
      receiverId,
      type: feedbackType,
      comment: comment ?? null,
      rating: rating !== undefined ? Number(rating) : null,
      isAnonymous: isAnonymous ?? false,
    },
    include: {
      giver: { select: { id: true, firstName: true, lastName: true } },
      receiver: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  return NextResponse.json({ feedback }, { status: 201 })
}
