import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps } from "@/lib/api-auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const c = caps(user.role)

  const request = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Employee can only cancel their own pending/approved requests
  if (!c.canViewAllLeave && request.employeeId !== user.employeeId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  }

  if (!["PENDING", "APPROVED"].includes(request.status)) {
    return NextResponse.json({ error: "Can only cancel pending or approved requests" }, { status: 400 })
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: c.canViewAllLeave ? "CANCELLED_BY_ADMIN" : "CANCELLED",
    },
  })

  // If was approved, restore employee status
  if (request.status === "APPROVED") {
    await prisma.employee.update({
      where: { id: request.employeeId },
      data: { employeeStatus: "ACTIVE" },
    })
  }

  return NextResponse.json({ request: updated })
}
