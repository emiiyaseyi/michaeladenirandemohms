import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const [totalEmp, active, onLeave, pending, openJobs] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { employeeStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { employeeStatus: "ON_LEAVE" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.jobPosting.count({ where: { status: "OPEN" } }),
  ])
  return NextResponse.json({ totalEmp, active, onLeave, pending, openJobs })
}
