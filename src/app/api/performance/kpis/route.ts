import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = req.nextUrl
  const cycleId = searchParams.get("cycleId")
  const filterEmployeeId = searchParams.get("employeeId")
  const status = searchParams.get("status")
  const mine = searchParams.get("mine") === "true"

  const where: any = {}
  if (cycleId) where.cycleId = cycleId
  if (status) where.status = status

  if (mine || user.role === "STAFF") {
    if (!user.employeeId) return forbidden("No employee linked to this account")
    where.employeeId = user.employeeId
  } else if (user.role === "PROJECT_LEAD" && !user.permissions["canViewPerformance"]) {
    // PL sees their team KPIs
    const team = await prisma.employee.findMany({
      where: { projectLeadId: user.employeeId },
      select: { id: true },
    })
    where.employeeId = { in: team.map(e => e.id) }
    if (filterEmployeeId) where.employeeId = filterEmployeeId
  } else {
    // Admin / elevated — see all, optionally filtered
    if (filterEmployeeId) where.employeeId = filterEmployeeId
  }

  const kpis = await prisma.kPI.findMany({
    where,
    include: {
      employee: { select: { employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
      cycle: { select: { name: true, year: true, half: true, isActive: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ kpis })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return forbidden("No employee linked to this account")

  const body = await req.json()
  const { cycleId, title, keyResultArea, weight, target, deadline, projectName, description } = body

  if (!cycleId || !title || weight === undefined) {
    return NextResponse.json({ error: "cycleId, title, and weight are required" }, { status: 400 })
  }

  const kpi = await prisma.kPI.create({
    data: {
      employeeId: user.employeeId,
      cycleId,
      title,
      keyResultArea: keyResultArea || null,
      weight: Number(weight),
      target: target || null,
      deadline: deadline ? new Date(deadline) : null,
      projectName: projectName || null,
      description: description || null,
      status: "SUBMITTED",
    },
    include: { employee: true },
  })
  return NextResponse.json({ kpi }, { status: 201 })
}
