import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { isBusDay, todayUTC, busTier, MAX_SEATS } from "@/lib/bus-utils"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const trip = body.trip as "MORNING" | "AFTERNOON"
  if (!trip || !["MORNING", "AFTERNOON"].includes(trip)) {
    return NextResponse.json({ error: "trip required (MORNING or AFTERNOON)" }, { status: 400 })
  }

  const now = new Date()
  if (!isBusDay(now)) {
    return NextResponse.json({ message: "Not a bus day - no allocation needed" })
  }

  const today = todayUTC()

  // Fetch all PENDING bookings for this trip today, sorted by booking time
  const bookings = await prisma.busBooking.findMany({
    where: { bookingDate: today, trip, status: "PENDING" },
    include: {
      employee: { select: { jobTitle: true, firstName: true, lastName: true } },
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { bookedAt: "asc" },
  })

  if (bookings.length === 0) {
    return NextResponse.json({ message: "No PENDING bookings to process", trip, confirmed: 0, bounced: 0 })
  }

  // Split into tier 1 (staff) and tier 2 (intern/associate)
  const staffBookings = bookings.filter(b => busTier(b.employee?.jobTitle) === "staff")
  const lowerBookings = bookings.filter(b => busTier(b.employee?.jobTitle) !== "staff")

  // Allocate: fill staff first, then lower if seats remain
  const confirmedStaff = staffBookings.slice(0, MAX_SEATS)
  const remaining = MAX_SEATS - confirmedStaff.length
  const confirmedLower = remaining > 0 ? lowerBookings.slice(0, remaining) : []
  const confirmed = [...confirmedStaff, ...confirmedLower]

  const bouncedStaff = staffBookings.slice(MAX_SEATS)
  const bouncedLower = lowerBookings.slice(remaining > 0 ? remaining : 0)
  const bounced = [...bouncedStaff, ...bouncedLower]

  // Update confirmed - assign seat numbers in order
  await Promise.all(
    confirmed.map((b, i) =>
      prisma.busBooking.update({
        where: { id: b.id },
        data: { status: "CONFIRMED", seatNumber: i + 1 },
      })
    )
  )

  // Update bounced
  if (bounced.length > 0) {
    await prisma.busBooking.updateMany({
      where: { id: { in: bounced.map(b => b.id) } },
      data: { status: "BOUNCED" },
    })
  }

  const tripLabel = trip === "MORNING" ? "Morning" : "Afternoon"
  const loginUrl = process.env.NEXTAUTH_URL ?? ""

  // Send notifications + emails to confirmed
  for (const b of confirmed) {
    const seatNum = confirmed.indexOf(b) + 1

    await prisma.notification.create({
      data: {
        userId: b.userId,
        title: `${tripLabel} Bus Confirmed - Seat #${seatNum}`,
        message: `Your seat on the ${tripLabel.toLowerCase()} bus is confirmed (Seat #${seatNum}, ${b.stop}). Have a safe trip!`,
        type: "SUCCESS",
        link: "/staff/requests/bus",
      },
    }).catch(() => {})

    await sendEmail({
      eventKey: "bus_booking_confirmed",
      toUserId: b.userId,
      variables: {
        name: b.user.name ?? b.employee.firstName,
        seatNumber: String(seatNum),
        trip: tripLabel,
        stop: b.stop,
        loginUrl,
      },
    }).catch(() => {})
  }

  // Send notifications + emails to bounced
  for (const b of bounced) {
    await prisma.notification.create({
      data: {
        userId: b.userId,
        title: `${tripLabel} Bus - No Seat Available`,
        message: `Unfortunately there is no space for you on the ${tripLabel.toLowerCase()} bus today. Please find alternative transport home.`,
        type: "WARNING",
        link: "/staff/requests/bus",
      },
    }).catch(() => {})

    await sendEmail({
      eventKey: "bus_booking_bounced",
      toUserId: b.userId,
      variables: {
        name: b.user.name ?? b.employee.firstName,
        trip: tripLabel,
        loginUrl,
      },
    }).catch(() => {})
  }

  return NextResponse.json({
    message: "Allocation complete",
    trip,
    confirmed: confirmed.length,
    bounced: bounced.length,
  })
}
