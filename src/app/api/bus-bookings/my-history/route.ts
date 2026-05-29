import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (!user.employeeId) {
    return NextResponse.json({ bookings: [] })
  }

  const trip = req.nextUrl.searchParams.get("trip") as "MORNING" | "AFTERNOON" | null
  const where: any = { employeeId: user.employeeId }
  if (trip) where.trip = trip

  const bookings = await prisma.busBooking.findMany({
    where,
    orderBy: { bookedAt: "desc" },
    take: 20,
  })

  return NextResponse.json({ bookings })
}
