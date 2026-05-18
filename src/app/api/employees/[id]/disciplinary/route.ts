import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  // Admin (canViewAllEmployees) OR an admin with canViewDisciplinary (hr-admin) OR the employee themselves
  const perms = (user as any).permissions ?? {}
  const isAdmin = caps(user.role).canViewAllEmployees || !!perms.canViewDisciplinary
  if (!isAdmin && user.employeeId !== id) return forbidden()

  const violations = await prisma.violation.findMany({
    where: { employeeId: id },
    include: {
      violationType: { select: { id: true, name: true } },
    },
    orderBy: { incidentDate: "desc" },
  })

  return NextResponse.json({ violations })
}
