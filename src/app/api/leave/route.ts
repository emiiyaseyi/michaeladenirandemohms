import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { differenceInBusinessDays } from "date-fns"

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? ""

  const [requests, leaveTypes, employees] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: status ? { status: status as any } : {},
      include: {
        employee: { include: { department: true } },
        leaveType: true,
        approvals: { include: { employee: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
  ])

  return NextResponse.json({ requests, leaveTypes, employees })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { employeeId, leaveTypeId, startDate, endDate, reason, handoverNotes } = body

  if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
    return NextResponse.json({ error: "All required fields must be provided" }, { status: 400 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.max(1, differenceInBusinessDays(end, start) + 1)

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { department: true } })
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId, leaveTypeId, startDate: start, endDate: end, days, reason,
      handoverNotes: handoverNotes || null,
      departmentId: employee.departmentId,
      status: "PENDING",
    },
    include: { employee: true, leaveType: true }
  })

  return NextResponse.json({ request }, { status: 201 })
}
