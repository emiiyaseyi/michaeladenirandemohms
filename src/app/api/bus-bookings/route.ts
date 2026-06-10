import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import {
  isBusDay, todayUTC, busTier, isWindowOpen,
  windowOpenTime, windowCloseTime, nextBusDay,
} from "@/lib/bus-utils"

// ── TESTING: window left permanently open ───────────────────────────────────
// Allows testing outside Mon/Wed/Fri and outside the real time windows.
// Flip to false (or delete this const + the guards below) before production.
// Documented in work.md under Round 7.
const TESTING_ALWAYS_OPEN = false

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const trip = req.nextUrl.searchParams.get("trip") as "MORNING" | "AFTERNOON" | null
  if (!trip || !["MORNING", "AFTERNOON"].includes(trip)) {
    return NextResponse.json({ error: "trip param required (MORNING or AFTERNOON)" }, { status: 400 })
  }

  const today = todayUTC()
  const now = new Date()
  const busDay = TESTING_ALWAYS_OPEN ? true : isBusDay(now)

  // Get all bookings for today
  const bookings = await prisma.busBooking.findMany({
    where: { bookingDate: today, trip, status: { not: "CANCELLED" } },
    include: {
      employee: { select: { jobTitle: true, firstName: true, lastName: true } },
    },
    orderBy: { bookedAt: "asc" },
  })

  const staffCount = bookings.filter(b => {
    const tier = busTier(b.employee?.jobTitle)
    return tier === "staff"
  }).length
  const lowerCount = bookings.length - staffCount

  // My booking
  const myBooking = user.employeeId
    ? bookings.find(b => b.employeeId === user.employeeId) ?? null
    : null

  // Window status for this user
  const emp = user.employeeId
    ? await prisma.employee.findUnique({ where: { id: user.employeeId }, select: { jobTitle: true } })
    : null
  const tier = busTier(emp?.jobTitle)

  const now2 = new Date()
  const openTime = windowOpenTime(trip, tier)
  const closeTime = windowCloseTime(trip)

  let windowStatus: "before" | "open" | "closed" | "no_bus_today"
  if (TESTING_ALWAYS_OPEN) {
    windowStatus = "open"
  } else if (!busDay) {
    windowStatus = "no_bus_today"
  } else if (isWindowOpen(trip, tier, now2)) {
    windowStatus = "open"
  } else {
    const { watTotalMinutes, MORNING_OPEN_MINS, AFTERNOON_OPEN } = await import("@/lib/bus-utils")
    const mins = watTotalMinutes(now2)
    if (trip === "MORNING") {
      windowStatus = mins < MORNING_OPEN_MINS ? "before" : "closed"
    } else {
      windowStatus = mins < AFTERNOON_OPEN[tier] ? "before" : "closed"
    }
  }

  return NextResponse.json({
    total: bookings.length,
    staffCount,
    lowerCount,
    myBooking,
    isBusDay: busDay,
    windowStatus,
    openTime,
    closeTime,
    nextBusDay: busDay ? null : nextBusDay(now2),
    tier,
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  // Admins don't book the bus
  if (user.role === "SUPER_ADMIN" && !user.employeeId) {
    return forbidden("Admins do not book the bus")
  }

  const body = await req.json()
  const { trip, stop } = body as { trip: "MORNING" | "AFTERNOON"; stop: string }

  if (!trip || !["MORNING", "AFTERNOON"].includes(trip)) {
    return NextResponse.json({ error: "trip must be MORNING or AFTERNOON" }, { status: 400 })
  }
  if (!stop) {
    return NextResponse.json({ error: "stop is required" }, { status: 400 })
  }

  const now = new Date()

  if (!TESTING_ALWAYS_OPEN && !isBusDay(now)) {
    return NextResponse.json({ error: "No bus service today. Bus runs Mon/Wed/Fri only." }, { status: 400 })
  }

  const emp = user.employeeId
    ? await prisma.employee.findUnique({ where: { id: user.employeeId }, select: { jobTitle: true } })
    : null
  if (!emp) {
    return NextResponse.json({ error: "Employee record not found. Only employees can book the bus." }, { status: 403 })
  }

  const tier = busTier(emp.jobTitle)

  if (!TESTING_ALWAYS_OPEN && !isWindowOpen(trip, tier, now)) {
    const openTime = windowOpenTime(trip, tier)
    const closeTime = windowCloseTime(trip)
    return NextResponse.json({
      error: `Booking window for ${trip.toLowerCase()} trip is not open. Opens at ${openTime}, closes at ${closeTime}.`,
    }, { status: 400 })
  }

  const today = todayUTC()

  // Check duplicate
  const existing = await prisma.busBooking.findFirst({
    where: { employeeId: user.employeeId!, bookingDate: today, trip, status: { not: "CANCELLED" } },
  })
  if (existing) {
    return NextResponse.json({ error: "You have already booked this trip today." }, { status: 409 })
  }

  const booking = await prisma.busBooking.create({
    data: {
      employeeId: user.employeeId!,
      userId: user.id,
      bookingDate: today,
      trip,
      stop,
      status: "PENDING",
    },
  })

  return NextResponse.json({ booking }, { status: 201 })
}
