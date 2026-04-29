import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageOffboarding) return forbidden()

  const requests = await prisma.exitRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          jobTitle: true,
          profilePhoto: true,
          employeeId: true,
          department: { select: { name: true } },
        },
      },
      reviewedBy: { select: { name: true } },
    },
  })

  return NextResponse.json({ requests })
}
