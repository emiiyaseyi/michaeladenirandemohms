import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, format } from "date-fns"
import { sendEmail } from "@/lib/email"
import { roleBasePath } from "@/lib/api-auth"

// Daily cron: flip Employee.employeeStatus ON/OFF leave on the correct calendar date,
// and notify the employee + PL approvers + relief officers + admins when leave starts.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date()

  // 1. Approved leaves that start today → flip employee to ON_LEAVE + notify everyone
  const starting = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { gte: startOfDay(today), lte: endOfDay(today) },
    },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, userId: true, employeeStatus: true,
          user: { select: { role: true } },
        },
      },
      leaveType: { select: { name: true } },
      approvals: {
        where: { stage: "PROJECT_LEAD" },
        select: { employee: { select: { userId: true } } },
      },
      reliefOfficersList: {
        select: { employee: { select: { userId: true, firstName: true, lastName: true } } },
      },
    },
  })

  let flipped = 0
  for (const lr of starting) {
    const emp = lr.employee
    if (emp.employeeStatus === "ACTIVE") {
      await prisma.employee.update({ where: { id: emp.id }, data: { employeeStatus: "ON_LEAVE" } })
      flipped++
    }

    // Notify the employee
    const empBase = roleBasePath((emp.user?.role as string) ?? "STAFF")
    await prisma.notification.create({
      data: {
        userId: emp.userId,
        employeeId: emp.id,
        title: "Your Leave Starts Today",
        message: `Your ${lr.leaveType.name} leave starts today. Returns ${format(lr.endDate, "MMM d, yyyy")}. Have a great break!`,
        type: "SUCCESS",
        link: `${empBase}/requests/leave`,
      },
    }).catch(() => {})

    // Build a deduped set of stakeholders: PL approvers + relief officers + admins
    const stakeholderUserIds = new Set<string>()
    for (const a of lr.approvals) {
      if (a.employee?.userId) stakeholderUserIds.add(a.employee.userId)
    }
    for (const r of lr.reliefOfficersList) {
      if (r.employee?.userId) stakeholderUserIds.add(r.employee.userId)
    }
    const admins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true },
    })
    for (const a of admins) stakeholderUserIds.add(a.id)
    stakeholderUserIds.delete(emp.userId)

    const empName = `${emp.firstName} ${emp.lastName}`
    const reliefNames = lr.reliefOfficersList.map(r => `${r.employee.firstName} ${r.employee.lastName}`)
    const reliefSentence = reliefNames.length > 0 ? ` ${reliefNames.join(" and ")} covering.` : ""
    for (const userId of stakeholderUserIds) {
      await prisma.notification.create({
        data: {
          userId,
          title: "Team Member on Leave",
          message: `${empName} is on ${lr.leaveType.name} from today until ${format(lr.endDate, "MMM d, yyyy")}.${reliefSentence}`,
          type: "INFO",
          link: "/admin/requests/leave",
        },
      }).catch(() => {})
      // leave_started_stakeholder email dropped (R6) — purely informational broadcast,
      // in-app notification suffices. See work.md Round 6.
    }
  }

  // 2. Approved leaves whose endDate already passed → flip back to ACTIVE
  const returning = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      endDate: { lt: startOfDay(today) },
      employee: { employeeStatus: "ON_LEAVE" },
    },
    select: { employeeId: true },
  })
  for (const lr of returning) {
    await prisma.employee.update({ where: { id: lr.employeeId }, data: { employeeStatus: "ACTIVE" } })
  }

  return NextResponse.json({ ok: true, started: starting.length, flipped, returned: returning.length })
}
