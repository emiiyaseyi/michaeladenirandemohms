import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { isWindowOpen, busTier } from "@/lib/bus-utils"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const booking = await prisma.busBooking.findUnique({
    where: { id },
    include: { employee: { select: { jobTitle: true } } },
  })

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (booking.userId !== user.id) return forbidden("You can only cancel your own bookings")
  if (booking.status !== "PENDING") {
    return NextResponse.json({ error: "Only PENDING bookings can be cancelled" }, { status: 400 })
  }

  const tier = busTier(booking.employee?.jobTitle)
  if (!isWindowOpen(booking.trip as "MORNING" | "AFTERNOON", tier)) {
    return NextResponse.json({ error: "Booking window has closed — cannot cancel after allocation" }, { status: 400 })
  }

  await prisma.busBooking.update({ where: { id }, data: { status: "CANCELLED" } })

  return NextResponse.json({ success: true })
}
