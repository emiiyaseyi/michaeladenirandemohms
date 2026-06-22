import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { subMonths, addDays } from "date-fns"

// Runs Monday 08:00 WAT via vercel.json cron.
// Finds employees converted from intern to staff ~5 months ago and notifies HR admins.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const fiveMonthsAgo = subMonths(now, 5)
  const windowStart = fiveMonthsAgo
  const windowEnd = addDays(fiveMonthsAgo, 7)

  const converted = await prisma.employee.findMany({
    where: {
      convertedAt: { gte: windowStart, lte: windowEnd },
      employeeStatus: "ACTIVE",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      convertedAt: true,
      userId: true,
    },
  })

  const hrAdmins = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { role: "SUPER_ADMIN" },
        {
          adminRoles: {
            some: {
              adminRole: { permissions: { path: ["canEditEmployee"], equals: true } },
            },
          },
        },
      ],
    },
    select: { id: true },
  })

  for (const emp of converted) {
    const empName = `${emp.firstName} ${emp.lastName}`
    for (const admin of hrAdmins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Intern Conversion 5-Month Check-in",
          message: `${empName} was converted from Intern to Staff 5 months ago. Consider scheduling an engagement check-in before the 6-month mark.`,
          type: "INFO",
          link: `/admin/people/employees/${emp.id}`,
        },
      }).catch(() => {})

      sendEmail({
        eventKey: "intern_conversion_followup",
        toUserId: admin.id,
        variables: {
          employeeName: empName,
          convertedAt: emp.convertedAt?.toISOString().split("T")[0] ?? "",
          profileLink: `${process.env.NEXTAUTH_URL ?? ""}/admin/people/employees/${emp.id}`,
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ checked: converted.length, notified: hrAdmins.length })
}
