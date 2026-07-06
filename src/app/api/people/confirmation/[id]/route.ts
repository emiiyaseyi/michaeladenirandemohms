import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canEditEmployee")
  if (perm) return perm

  const { id } = await params

  const employee = await prisma.employee.update({
    where: { id },
    data: { confirmationDate: new Date(), onProbation: false },
    select: { id: true, firstName: true, lastName: true, confirmationDate: true, onProbation: true },
  })

  return NextResponse.json({ employee })
}
