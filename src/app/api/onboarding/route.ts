import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)

  // Scope: admins/managers see all; staff/intern see own tasks only
  let filter: any = {}
  if (!c.canManageOnboarding) {
    if (c.canViewOwnOnboarding && user.employeeId) {
      filter = { employeeId: user.employeeId }
    } else {
      return forbidden("No access to onboarding data")
    }
  }

  const tasks = await prisma.onboardingTask.findMany({
    where: filter,
    include: { employee: { select: { firstName: true, lastName: true, profilePhoto: true } } },
    orderBy: { createdAt: "desc" }
  })
  return NextResponse.json({ tasks })
}
