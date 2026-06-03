import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { busTier } from "@/lib/bus-utils"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const denied = requirePermission(user, "canViewAllEmployees")
  if (denied) return denied

  const url = req.nextUrl
  const trip = url.searchParams.get("trip") as "MORNING" | "AFTERNOON" | null
  const fromParam = url.searchParams.get("from")
  const toParam = url.searchParams.get("to")

  // Default to today
  const today = new Date(); today.setUTCHours(0,0,0,0)
  const from = fromParam ? new Date(fromParam) : today
  const to = toParam ? new Date(toParam) : today

  const where: any = {
    bookingDate: { gte: from, lte: to },
  }
  if (trip) where.trip = trip

  const bookings = await prisma.busBooking.findMany({
    where,
    include: {
      employee: {
        select: { firstName: true, lastName: true, jobTitle: true, department: { select: { name: true } } },
      },
    },
    orderBy: [{ bookingDate: "asc" }, { trip: "asc" }, { seatNumber: "asc" }, { bookedAt: "asc" }],
  })

  const result = bookings.map(b => ({
    id: b.id,
    employeeId: b.employeeId,
    name: `${b.employee.firstName} ${b.employee.lastName}`,
    jobTitle: b.employee.jobTitle,
    tier: busTier(b.employee.jobTitle),
    dept: b.employee.department?.name ?? "–",
    trip: b.trip,
    stop: b.stop,
    seatNumber: b.seatNumber,
    status: b.status,
    bookingDate: b.bookingDate,
    bookedAt: b.bookedAt,
  }))

  // Stats
  const morningConfirmed = result.filter(r => r.trip === "MORNING" && r.status === "CONFIRMED").length
  const afternoonConfirmed = result.filter(r => r.trip === "AFTERNOON" && r.status === "CONFIRMED").length
  const totalPending = result.filter(r => r.status === "PENDING").length
  const totalBounced = result.filter(r => r.status === "BOUNCED").length

  return NextResponse.json({ bookings: result, stats: { morningConfirmed, afternoonConfirmed, totalPending, totalBounced } })
}
