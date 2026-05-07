import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  if (user.employeeId !== id && !caps(user.role).canViewAllEmployees) return forbidden()

  const tasks = await prisma.onboardingTask.findMany({
    where: { employeeId: id },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ tasks })
}
