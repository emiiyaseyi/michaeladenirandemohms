import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { DEFAULT_WEIGHTS, DEFAULT_QUERY_BANDS, DEFAULT_RECOMMENDATION_BANDS } from "@/lib/appraisal-defaults"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  // Any authenticated user can list cycles (used by staff/lead pages too).
  const cycles = await prisma.performanceCycle.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { appraisals: true, questions: true } } },
  })
  return NextResponse.json({ cycles })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm

  const { name, year, half, startDate, endDate, kpiDeadline, peerCount } = await req.json()
  const cycle = await prisma.performanceCycle.create({
    data: {
      name, year: Number(year), half: Number(half ?? 1),
      startDate: new Date(startDate), endDate: new Date(endDate),
      kpiDeadline: kpiDeadline ? new Date(kpiDeadline) : null,
      peerCount: Number(peerCount ?? 3),
      stage: "CONFIG",
      weights: DEFAULT_WEIGHTS as any,
      queryBands: DEFAULT_QUERY_BANDS as any,
      recommendationBands: DEFAULT_RECOMMENDATION_BANDS as any,
    },
  })

  await logAudit({ req, actor: user, action: "APPRAISAL_CYCLE_CREATE", entity: "PerformanceCycle", entityId: cycle.id, newValues: { name, year, half } })
  return NextResponse.json({ cycle }, { status: 201 })
}
