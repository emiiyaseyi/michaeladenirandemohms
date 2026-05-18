import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  // Admin (canViewAllEmployees) OR the employee themselves can see their assignments
  const isAdmin = caps(user.role).canViewAllEmployees
  if (!isAdmin && user.employeeId !== id) return forbidden()

  const assignments = await prisma.assetAssignment.findMany({
    where: { employeeId: id },
    include: {
      asset: {
        select: {
          id: true, name: true, identifier: true, description: true,
          assetType: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json({ assignments })
}
