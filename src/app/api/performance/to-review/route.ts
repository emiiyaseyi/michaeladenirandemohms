import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

// Appraisals where the caller is an assigned reviewer (primary or counter).
export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ reviews: [] })

  const rows = await prisma.appraisalReviewer.findMany({
    where: { reviewerId: user.employeeId },
    include: {
      appraisal: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
          cycle: { select: { id: true, name: true, stage: true, year: true, half: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const reviews = rows.map(r => ({
    reviewerRowId: r.id,
    role: r.role,
    submittedAt: r.submittedAt,
    appraisalId: r.appraisalId,
    stage: r.appraisal.stage,
    subject: r.appraisal.employee,
    cycle: r.appraisal.cycle,
  }))
  return NextResponse.json({ reviews })
}
