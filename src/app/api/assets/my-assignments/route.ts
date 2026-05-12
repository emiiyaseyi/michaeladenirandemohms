import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  if (!user.employeeId) return NextResponse.json({ assignments: [] })

  const assignments = await prisma.assetAssignment.findMany({
    where: { employeeId: user.employeeId },
    include: {
      asset: {
        include: { assetType: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ assignments })
}
