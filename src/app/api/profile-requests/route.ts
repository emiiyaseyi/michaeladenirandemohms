import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, hasCap } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = hasCap(user, "canViewAllEmployees")

  if (isAdmin) {
    const status = req.nextUrl.searchParams.get("status") ?? undefined

    const requests = await prisma.profileUpdateRequest.findMany({
      where: { ...(status ? { status: status as any } : {}) },
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeId: true,
            jobTitle: true, profilePhoto: true,
            department: { select: { name: true } },
            user: { select: { role: true } },
          },
        },
        reviewer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ requests })
  }

  // Employee sees only their own requests
  let empId = user.employeeId
  if (!empId) {
    const emp = await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } })
    empId = emp?.id
  }
  if (!empId) return NextResponse.json({ requests: [] })

  const requests = await prisma.profileUpdateRequest.findMany({
    where: { employeeId: empId },
    orderBy: { createdAt: "desc" },
    take: 5,
  })
  return NextResponse.json({ requests })
}
