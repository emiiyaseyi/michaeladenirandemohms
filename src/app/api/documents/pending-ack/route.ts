import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ docs: [] })

  const docs = await prisma.orgDocument.findMany({
    where: {
      isActive: true,
      canView: true,
      requiresAck: true,
      acknowledgments: {
        none: { employeeId: user.employeeId, acknowledged: true },
      },
    },
    select: { id: true, title: true, category: true, fileUrl: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ docs })
}
