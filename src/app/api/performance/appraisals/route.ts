import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isAdminLike } from "@/lib/appraisal"

// List appraisals.
//  - scope=all   → admin only (every appraisal in the cycle)
//  - scope=mine  → the caller's own appraisals
//  - default     → admin sees all, others see own
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const cycleId = req.nextUrl.searchParams.get("cycleId") ?? undefined
  const scope = req.nextUrl.searchParams.get("scope") ?? "auto"
  const admin = isAdminLike(user)

  const where: any = {}
  if (cycleId) where.cycleId = cycleId
  if (scope === "mine" || (!admin && scope !== "all")) {
    where.employeeId = user.employeeId ?? "__none__"
  } else if (scope === "all" && !admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const appraisals = await prisma.appraisal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      cycle: { select: { id: true, name: true, year: true, half: true, stage: true } },
      employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
      reviewers: { include: { reviewer: { select: { id: true, firstName: true, lastName: true } } } },
      _count: { select: { peers: true, ratings: true } },
    },
  })
  return NextResponse.json({ appraisals })
}
