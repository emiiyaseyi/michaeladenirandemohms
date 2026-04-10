import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { eachDayOfInterval, isWeekend, format, parseISO } from "date-fns"

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = req.nextUrl
  const startStr = searchParams.get("start")
  const endStr = searchParams.get("end")
  const leaveTypeId = searchParams.get("leaveTypeId")

  if (!startStr || !endStr) {
    return NextResponse.json({ days: 0, holidays: [] })
  }

  const start = parseISO(startStr)
  const end = parseISO(endStr)

  if (end < start) return NextResponse.json({ days: 0, holidays: [] })

  // Fetch leave type to check excludeWeekends
  let excludeWeekends = true
  if (leaveTypeId) {
    const lt = await prisma.leaveType.findUnique({ where: { id: leaveTypeId }, select: { excludeWeekends: true } })
    if (lt) excludeWeekends = lt.excludeWeekends
  }

  // Fetch public holidays in range
  const year = start.getFullYear()
  const publicHolidays = await prisma.publicHoliday.findMany({
    where: {
      year: { in: [year, year + 1] },
      date: { gte: start, lte: end },
    },
    select: { date: true, name: true },
  })

  const holidayDates = new Set(publicHolidays.map(h => format(h.date, "yyyy-MM-dd")))

  // Count working days
  const allDays = eachDayOfInterval({ start, end })
  const workingDays = allDays.filter(day => {
    if (excludeWeekends && isWeekend(day)) return false
    if (holidayDates.has(format(day, "yyyy-MM-dd"))) return false
    return true
  })

  return NextResponse.json({
    days: workingDays.length,
    holidays: publicHolidays.map(h => ({ date: h.date, name: h.name })),
    totalCalendarDays: allDays.length,
    weekendDays: excludeWeekends ? allDays.filter(d => isWeekend(d)).length : 0,
  })
}
