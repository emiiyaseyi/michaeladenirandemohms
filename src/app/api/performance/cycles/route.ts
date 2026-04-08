import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManagePerformanceCycles) return forbidden()
  const { name, year, half, startDate, endDate } = await req.json()
  const cycle = await prisma.performanceCycle.create({
    data: { name, year: Number(year), half: Number(half ?? 1), startDate: new Date(startDate), endDate: new Date(endDate) }
  })
  return NextResponse.json({ cycle }, { status: 201 })
}
