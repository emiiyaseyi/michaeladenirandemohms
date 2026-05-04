import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { format, subDays, isWeekend, startOfDay, endOfDay } from "date-fns"
import { roleBasePath } from "@/lib/api-auth"

// Returns the most recent business day (Mon-Fri) before today
function lastBusinessDay(): Date {
  let d = subDays(new Date(), 1)
  while (isWeekend(d)) d = subDays(d, 1)
  return d
}

export async function POST() {
  const lbd = lastBusinessDay()

  // Find approved leaves that ended on the last business day
  const ended = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      endDate: { gte: startOfDay(lbd), lte: endOfDay(lbd) },
    },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, userId: true,
          user: { select: { role: true } },
          secondaryProjectLeadIds: true,
          projectLeadId: true,
        },
      },
      leaveType: { select: { name: true } },
      reliefOfficersList: {
        select: { employeeId: true, employee: { select: { userId: true, user: { select: { role: true } } } } },
      },
      approvals: {
        where: { stage: "PROJECT_LEAD" },
        select: { employeeId: true, employee: { select: { userId: true, user: { select: { role: true } } } } },
      },
    },
  })

  let count = 0
  for (const lr of ended) {
    const emp = lr.employee
    const empRole = (emp.user?.role as string) ?? "STAFF"
    const empBase = roleBasePath(empRole)

    // Welcome back the returning employee
    await prisma.notification.create({
      data: {
        userId: emp.userId,
        employeeId: emp.id,
        title: "Welcome Back!",
        message: `We hope you had a great break. Welcome back from your ${lr.leaveType.name}!`,
        type: "SUCCESS",
        link: `${empBase}/dashboard`,
      },
    })

    // Build a deduplicated set of people to notify: PLs + relief officers + all admins
    const notifyUserIds = new Set<string>()

    // Add PL approvers
    for (const a of lr.approvals) {
      if (a.employee?.userId) notifyUserIds.add(a.employee.userId)
    }

    // Add relief officers (but skip if they're already a PL notified above)
    for (const r of lr.reliefOfficersList) {
      if (r.employee?.userId) notifyUserIds.add(r.employee.userId)
    }

    // Add all admins/HR
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true },
    })
    for (const a of admins) notifyUserIds.add(a.id)

    // Remove the employee themselves
    notifyUserIds.delete(emp.userId)

    for (const userId of notifyUserIds) {
      await prisma.notification.create({
        data: {
          userId,
          title: "Employee Back from Leave",
          message: `${emp.firstName} ${emp.lastName} has returned from their ${lr.leaveType.name} leave today.`,
          type: "INFO",
          link: `/admin/requests/leave`,
        },
      })
    }

    count++
  }

  return NextResponse.json({ ok: true, processed: count })
}
