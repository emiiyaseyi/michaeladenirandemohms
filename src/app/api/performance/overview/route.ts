import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { getActiveCycle, isAdminLike } from "@/lib/appraisal"

export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const cycle = await getActiveCycle()
  const admin = isAdminLike(user)
  const eid = user.employeeId

  let adminStats: any = null
  if (admin && cycle) {
    const grouped = await prisma.appraisal.groupBy({ by: ["stage"], where: { cycleId: cycle.id }, _count: true })
    const byStage: Record<string, number> = {}
    grouped.forEach(g => { byStage[g.stage] = g._count })
    const total = grouped.reduce((a, g) => a + g._count, 0)
    adminStats = { total, byStage }
  }

  let myAppraisal: any = null
  let peerPending = 0
  let reviewsPending = 0
  if (eid && cycle) {
    const a = await prisma.appraisal.findUnique({
      where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: eid } },
      select: { id: true, stage: true, finalPercent: true, finalReviewerPercent: true, teamLeadPercent: true },
    })
    myAppraisal = a
    peerPending = await prisma.appraisalPeer.count({ where: { peerId: eid, status: "PENDING", appraisal: { cycleId: cycle.id } } })
    reviewsPending = await prisma.appraisalReviewer.count({ where: { reviewerId: eid, submittedAt: null, appraisal: { cycleId: cycle.id } } })
  }

  return NextResponse.json({ cycle, admin, adminStats, myAppraisal, peerPending, reviewsPending })
}
