import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, isAdminRole } from "@/lib/api-auth"

function calcNetPay(d: any): number {
  const earnings = (d.basicSalary ?? 0) + (d.housing ?? 0) + (d.transport ?? 0) + (d.meal ?? 0) + (d.otherAllowances ?? 0)
  const deductions = (d.payeTax ?? 0) + (d.pension ?? 0) + (d.nhf ?? 0) + (d.healthInsurance ?? 0) + (d.otherDeductions ?? 0)
  return earnings - deductions
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminRole(user.role)) return forbidden()

  const { id } = await params
  const body = await req.json()
  const {
    grossSalary, basicSalary,
    housing, transport, meal, otherAllowances,
    payeTax, pension, nhf, healthInsurance, otherDeductions,
    notes, status,
  } = body

  const existing = await prisma.payslip.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Merge with existing values for net pay calculation
  const merged = {
    basicSalary: basicSalary ?? existing.basicSalary,
    housing: housing ?? existing.housing,
    transport: transport ?? existing.transport,
    meal: meal ?? existing.meal,
    otherAllowances: otherAllowances ?? existing.otherAllowances,
    payeTax: payeTax ?? existing.payeTax,
    pension: pension ?? existing.pension,
    nhf: nhf ?? existing.nhf,
    healthInsurance: healthInsurance ?? existing.healthInsurance,
    otherDeductions: otherDeductions ?? existing.otherDeductions,
  }
  const netPay = calcNetPay(merged)

  const updated = await prisma.payslip.update({
    where: { id },
    data: {
      ...(grossSalary !== undefined && { grossSalary }),
      ...merged,
      netPay,
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && {
        status,
        releasedAt: status === "RELEASED" ? (existing.releasedAt ?? new Date()) : existing.releasedAt,
      }),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
    },
  })

  // Notify employee if released
  if (status === "RELEASED" && existing.status !== "RELEASED") {
    const emp = await prisma.employee.findUnique({ where: { id: existing.employeeId }, select: { userId: true } })
    if (emp) {
      const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      await prisma.notification.create({
        data: {
          userId: emp.userId,
          employeeId: existing.employeeId,
          title: "Your Payslip is Ready",
          message: `Your payslip for ${MONTHS[(updated.month ?? 1) - 1]} ${updated.year} has been released.`,
          type: "SUCCESS",
          link: "/self-service/profile?tab=payslips",
        },
      })
    }
  }

  return NextResponse.json({ payslip: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminRole(user.role)) return forbidden()

  const { id } = await params
  const existing = await prisma.payslip.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.status === "RELEASED") return NextResponse.json({ error: "Cannot delete a released payslip" }, { status: 409 })

  await prisma.payslip.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
