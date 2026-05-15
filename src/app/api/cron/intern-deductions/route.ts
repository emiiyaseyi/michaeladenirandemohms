import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay } from "date-fns"

// Runs Saturday 12:00 WAT (11:00 UTC) via vercel.json cron
// First run (day after late Friday): set pointDeduction = 2
// Second run (day after that if still not resolved): set pointDeduction = 3
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // Find LATE reports from this week (Friday just passed) with no deduction yet → set -2
  const lastFriday = subDays(now, 1) // Cron runs Saturday → lastFriday is yesterday
  const weekStart = startOfDay(subDays(lastFriday, 4)) // Monday of that week

  const firstRun = await prisma.internWeeklyReport.updateMany({
    where: {
      status: "LATE",
      lateFlag: true,
      pointDeduction: 0,
      weekStart: { gte: weekStart, lte: endOfDay(lastFriday) },
    },
    data: { pointDeduction: 2 },
  })

  // Reports already at -2 from the prior run (previous week LATE still unreviewed) → set -3
  const prevWeekStart = startOfDay(subDays(weekStart, 7))
  const prevWeekEnd = endOfDay(subDays(weekStart, 1))
  const secondRun = await prisma.internWeeklyReport.updateMany({
    where: {
      status: "LATE",
      lateFlag: true,
      pointDeduction: 2,
      weekStart: { gte: prevWeekStart, lte: prevWeekEnd },
    },
    data: { pointDeduction: 3 },
  })

  return NextResponse.json({ firstRun: firstRun.count, secondRun: secondRun.count })
}
