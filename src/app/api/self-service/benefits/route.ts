import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  if (!user.employeeId) return NextResponse.json({ enrollments: [] })

  const enrollments = await prisma.benefitEnrollment.findMany({
    where: { employeeId: user.employeeId },
    include: { benefit: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ enrollments })
}
