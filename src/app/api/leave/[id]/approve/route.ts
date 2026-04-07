import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { action, comment } = await req.json()

  const request = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: action === "APPROVED" ? "APPROVED" : "REJECTED",
      updatedAt: new Date(),
    }
  })

  // If approved, update employee status
  if (action === "APPROVED") {
    await prisma.employee.update({
      where: { id: request.employeeId },
      data: { employeeStatus: "ON_LEAVE" }
    })
  }

  return NextResponse.json({ request: updated })
}
