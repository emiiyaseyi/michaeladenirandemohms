import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { format, isWeekend, subDays, startOfDay, endOfDay } from "date-fns"

// Called on dashboard load — flips employee status ON/OFF leave on the correct calendar date
export async function POST() {
  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")

  // 1. Set ON_LEAVE for approved leaves that start today
  const starting = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { gte: startOfDay(today), lte: endOfDay(today) },
    },
    include: { employee: { select: { id: true, employeeStatus: true } } },
  })
  for (const lr of starting) {
    if (lr.employee.employeeStatus === "ACTIVE") {
      await prisma.employee.update({ where: { id: lr.employeeId }, data: { employeeStatus: "ON_LEAVE" } })
    }
  }

  // 2. Restore ACTIVE for employees whose leave ended — find next business day
  const returning = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      endDate: { lt: startOfDay(today) },
      employee: { employeeStatus: "ON_LEAVE" },
    },
    include: { employee: { select: { id: true } } },
  })
  for (const lr of returning) {
    await prisma.employee.update({ where: { id: lr.employeeId }, data: { employeeStatus: "ACTIVE" } })
  }

  return NextResponse.json({ ok: true, started: starting.length, returned: returning.length })
}
