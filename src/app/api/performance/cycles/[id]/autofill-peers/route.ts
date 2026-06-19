import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { peerCandidatesOf } from "@/lib/appraisal"
import { notifyPeersAssigned } from "@/lib/appraisal-notify"

// Auto-assign peers to appraisals in this cycle based on shared projects.
// For each appraisal with fewer than peerCount peers, top up from project mates
// (excluding the subject and assigned reviewers). Admin can adjust afterwards.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canAssignReviewers")
  if (perm) return perm

  const { id } = await params
  const cycle = await prisma.performanceCycle.findUnique({ where: { id } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
  const peerCount = cycle.peerCount ?? 3

  const appraisals = await prisma.appraisal.findMany({
    where: { cycleId: id },
    include: { peers: true, reviewers: true },
  })

  let assigned = 0
  const newPeerIds: string[] = []
  for (const a of appraisals) {
    const have = a.peers.length
    if (have >= peerCount) continue
    const excluded = new Set<string>([a.employeeId, ...a.reviewers.map(r => r.reviewerId), ...a.peers.map(p => p.peerId)])
    // Preserve department-priority order from peerCandidatesOf — do not re-sort.
    const mates = (await peerCandidatesOf(a.employeeId)).filter(m => !excluded.has(m))
    const need = peerCount - have
    const pick = mates.slice(0, need)
    for (const peerId of pick) {
      await prisma.appraisalPeer.create({ data: { appraisalId: a.id, peerId } })
      assigned++
      newPeerIds.push(peerId)
    }
  }

  await notifyPeersAssigned(newPeerIds)
  await logAudit({ req, actor: user, action: "APPRAISAL_AUTOFILL_PEERS", entity: "PerformanceCycle", entityId: id, newValues: { assigned } })
  return NextResponse.json({ ok: true, assigned })
}
