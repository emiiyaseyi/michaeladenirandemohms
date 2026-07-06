import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, sendEmailToMany } from "@/lib/email"
import { format } from "date-fns"
import { requireCronSecret } from "@/lib/cron-auth"

export async function GET(req: NextRequest) {
  const authError = requireCronSecret(req)
  if (authError) return authError

  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const todayLabel = format(today, "MMMM d, yyyy")

  const allActive = await prisma.employee.findMany({
    where: { employeeStatus: "ACTIVE", dateOfBirth: { not: null } },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, userId: true },
  })

  const celebrants = allActive.filter(e => {
    const dob = e.dateOfBirth!
    return dob.getMonth() + 1 === month && dob.getDate() === day
  })

  if (celebrants.length === 0) return NextResponse.json({ ok: true, count: 0 })

  // Send birthday greeting to each employee
  for (const emp of celebrants) {
    await sendEmail({
      eventKey: "birthday_employee",
      toUserId: emp.userId,
      variables: { employeeName: `${emp.firstName} ${emp.lastName}` },
    })
  }

  // Send digest to HR admins (SUPER_ADMIN + canViewAllEmployees)
  const [superAdmins, elevated] = await Promise.all([
    prisma.user.findMany({ where: { role: "SUPER_ADMIN", isActive: true }, select: { id: true } }),
    prisma.userAdminRole.findMany({
      where: { adminRole: { permissions: { path: ["canViewAllEmployees"], equals: true } } },
      select: { userId: true },
    }),
  ])

  const hrUserIds = [...new Set([
    ...superAdmins.map(u => u.id),
    ...elevated.map(u => u.userId),
  ])]

  // Remove celebrants from HR digest recipients
  const celebrantUserIds = new Set(celebrants.map(e => e.userId))
  const digestRecipients = hrUserIds.filter(id => !celebrantUserIds.has(id))

  const namesList = celebrants.map(e => `${e.firstName} ${e.lastName}`).join(", ")

  await sendEmailToMany(digestRecipients, {
    eventKey: "birthday_digest",
    variables: {
      count: String(celebrants.length),
      names: namesList,
      today: todayLabel,
    },
  })

  return NextResponse.json({ ok: true, count: celebrants.length })
}
