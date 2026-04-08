import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { differenceInBusinessDays } from "date-fns"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)
  const status = req.nextUrl.searchParams.get("status") ?? ""

  // Build scope filter
  let scopeFilter: any = {}
  if (c.canViewAllLeave) {
    // admin / HR / audit — see everything
    scopeFilter = status ? { status: status as any } : {}
  } else if (c.canViewTeamLeave) {
    // MANAGER: direct reports; DEPARTMENT_LEAD: dept
    if (user.role === "MANAGER") {
      const reports = await prisma.employee.findMany({
        where: { managerId: user.employeeId },
        select: { id: true },
      })
      const ids = reports.map(r => r.id)
      scopeFilter = {
        employeeId: { in: ids },
        ...(status ? { status: status as any } : {}),
      }
    } else if (user.role === "DEPARTMENT_LEAD") {
      const me = await prisma.employee.findUnique({
        where: { id: user.employeeId },
        select: { departmentId: true },
      })
      scopeFilter = {
        ...(me?.departmentId ? { departmentId: me.departmentId } : {}),
        ...(status ? { status: status as any } : {}),
      }
    }
  } else {
    // STAFF / INTERN / others — own requests only
    scopeFilter = {
      employeeId: user.employeeId,
      ...(status ? { status: status as any } : {}),
    }
  }

  const [requests, leaveTypes, employees] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: scopeFilter,
      include: {
        employee: { include: { department: true } },
        leaveType: true,
        approvals: { include: { employee: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    // Only admins/managers need the employee picker for submitting on behalf
    c.canViewAllLeave || c.canViewTeamLeave
      ? prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } })
      : prisma.employee.findMany({ where: { id: user.employeeId ?? "" }, select: { id: true, firstName: true, lastName: true } }),
  ])

  return NextResponse.json({ requests, leaveTypes, employees })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canSubmitLeave) return forbidden()

  const body = await req.json()
  const { employeeId, leaveTypeId, startDate, endDate, reason, handoverNotes } = body

  // Non-admins can only submit for themselves
  const c = caps(user.role)
  if (!c.canViewAllLeave && employeeId !== user.employeeId) {
    return forbidden("You can only submit leave for yourself")
  }

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
