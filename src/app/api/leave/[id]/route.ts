import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps } from "@/lib/api-auth"
import { parseISO, format } from "date-fns"
import { eachDayOfInterval, isWeekend } from "date-fns"

async function calcDays(startDate: Date, endDate: Date, leaveTypeId: string) {
  const lt = await prisma.leaveType.findUnique({ where: { id: leaveTypeId }, select: { excludeWeekends: true } })
  const excludeWeekends = lt?.excludeWeekends ?? true
  const year = startDate.getFullYear()
  const publicHolidays = await prisma.publicHoliday.findMany({
    where: { year: { in: [year, year + 1] }, date: { gte: startDate, lte: endDate } },
    select: { date: true },
  })
  const holidayDates = new Set(publicHolidays.map(h => format(h.date, "yyyy-MM-dd")))
  return eachDayOfInterval({ start: startDate, end: endDate }).filter(day => {
    if (excludeWeekends && isWeekend(day)) return false
    if (holidayDates.has(format(day, "yyyy-MM-dd"))) return false
    return true
  }).length
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const { startDate, endDate, reason, handoverNotes } = body

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      reliefOfficersList: true,
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isAdmin = caps(user.role).canViewAllLeave
  const isOwner = request.employeeId === user.employeeId

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Can only edit pending leave requests" }, { status: 400 })
  }

  // Check if any relief officer has already responded (non-admin only)
  if (!isAdmin) {
    const anyResponded = request.reliefOfficersList.some(r => r.status !== "PENDING")
    if (anyResponded) {
      return NextResponse.json({
        error: "Cannot edit: a relief officer has already responded. Contact HR to make changes.",
      }, { status: 400 })
    }
  }

  const updates: any = {}
  if (reason !== undefined) updates.reason = reason
  if (handoverNotes !== undefined) updates.handoverNotes = handoverNotes || null

  if (startDate && endDate) {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    if (end < start) return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    updates.startDate = start
    updates.endDate = end
    updates.days = Math.max(1, await calcDays(start, end, request.leaveTypeId))
  }

  const updated = await prisma.leaveRequest.update({ where: { id }, data: updates })
  return NextResponse.json({ request: updated })
}
