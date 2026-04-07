import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const [kpis, cycles, employees] = await Promise.all([
    prisma.kPI.findMany({ include: { employee: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.performanceCycle.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
  ])
  return NextResponse.json({ kpis, cycles, employees })
}
