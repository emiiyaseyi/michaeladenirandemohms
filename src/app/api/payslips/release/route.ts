import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, isAdminRole } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminRole(user.role)) return forbidden()

  const { ids, month, year } = await req.json()

  // Either release specific IDs or all PENDING for a given month/year
  let where: any = { status: "PENDING" }
  if (ids?.length) {
    where = { id: { in: ids }, status: "PENDING" }
  } else if (month && year) {
    where = { month, year, status: "PENDING" }
  }

  const payslips = await prisma.payslip.findMany({ where, select: { id: true, employeeId: true, month: true, year: true } })
  if (!payslips.length) return NextResponse.json({ ok: true, count: 0 })

  const now = new Date()
  await prisma.payslip.updateMany({ where: { id: { in: payslips.map(p => p.id) } }, data: { status: "RELEASED", releasedAt: now } })

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  // Notify each employee
  for (const p of payslips) {
    const emp = await prisma.employee.findUnique({ where: { id: p.employeeId }, select: { userId: true } })
    if (emp) {
      await prisma.notification.create({
        data: {
          userId: emp.userId,
          employeeId: p.employeeId,
          title: "Your Payslip is Ready",
          message: `Your payslip for ${MONTHS[(p.month ?? 1) - 1]} ${p.year} has been released.`,
          type: "SUCCESS",
          link: "/self-service/profile?tab=payslips",
        },
      })
    }
  }

  return NextResponse.json({ ok: true, count: payslips.length })
}
