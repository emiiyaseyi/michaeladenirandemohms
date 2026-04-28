import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

// Compute net pay from payslip fields
function calcNetPay(d: any): number {
  const earnings = (d.basicSalary ?? 0) + (d.housing ?? 0) + (d.transport ?? 0) + (d.meal ?? 0) + (d.otherAllowances ?? 0)
  const deductions = (d.payeTax ?? 0) + (d.pension ?? 0) + (d.nhf ?? 0) + (d.healthInsurance ?? 0) + (d.otherDeductions ?? 0)
  return earnings - deductions
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = req.nextUrl

  const status = searchParams.get("status") ?? undefined
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined
  const employeeId = searchParams.get("employeeId") ?? undefined

  const isPayrollAdmin = user.role === "ADMIN"

  let where: any = {}
  if (isPayrollAdmin) {
    if (status) where.status = status
    if (month) where.month = month
    if (year) where.year = year
    if (employeeId) where.employeeId = employeeId
  } else {
    // Self: employee can view own released payslips
    // employeeId may be missing from token if account was linked after last login — look it up
    let selfEmployeeId = user.employeeId
    if (!selfEmployeeId) {
      const emp = await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } })
      selfEmployeeId = emp?.id
    }
    if (!selfEmployeeId) return NextResponse.json({ payslips: [] })
    where.employeeId = selfEmployeeId
    where.status = "RELEASED"
    if (month) where.month = month
    if (year) where.year = year
  }

  const payslips = await prisma.payslip.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, employeeId: true,
          jobTitle: true, profilePhoto: true, bankName: true, bankAccountNo: true,
          bankAccountName: true, pensionPin: true, tin: true, nhfNo: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
  })

  // Return all active employees for HR to pick from when creating payslips
  let employees: any[] = []
  if (isPayrollAdmin) {
    employees = await prisma.employee.findMany({
      where: { employeeStatus: "ACTIVE" },
      select: {
        id: true, firstName: true, lastName: true, employeeId: true,
        jobTitle: true, grossSalary: true,
        department: { select: { name: true } },
      },
      orderBy: { firstName: "asc" },
    })
  }

  return NextResponse.json({ payslips, employees })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "ADMIN") return forbidden()

  const body = await req.json()
  const {
    employeeId, month, year,
    grossSalary, basicSalary,
    housing = 0, transport = 0, meal = 0, otherAllowances = 0,
    payeTax = 0, pension = 0, nhf = 0, healthInsurance = 0, otherDeductions = 0,
    notes, status = "DRAFT",
  } = body

  if (!employeeId || !month || !year || !grossSalary || !basicSalary) {
    return NextResponse.json({ error: "employeeId, month, year, grossSalary, and basicSalary are required" }, { status: 400 })
  }

  const netPay = calcNetPay({ basicSalary, housing, transport, meal, otherAllowances, payeTax, pension, nhf, healthInsurance, otherDeductions })

  const payslip = await prisma.payslip.create({
    data: {
      employeeId, month, year,
      grossSalary, basicSalary,
      housing, transport, meal, otherAllowances,
      payeTax, pension, nhf, healthInsurance, otherDeductions,
      netPay, notes, status,
      releasedAt: status === "RELEASED" ? new Date() : null,
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
    },
  })

  return NextResponse.json({ payslip }, { status: 201 })
}
