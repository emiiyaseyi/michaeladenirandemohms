import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isAdminLike, recomputeAndPersist } from "@/lib/appraisal"
import { logAudit } from "@/lib/audit"

// Admin reopens a submitted part of an appraisal so the person can re-do it.
// Once they re-submit, it locks again (buttons flip back to View).
//   target "SELF"   → reset the appraisal to DRAFT (staff edits again while OPEN)
//   target "PEER"   → set that peer assignment back to PENDING (keeps their answers to edit)
//   target "MEMBER" → clear that team member's upward (leadership) ratings so they re-rate
// Body: { target, peerId?, raterId? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!isAdminLike(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const appraisal = await prisma.appraisal.findUnique({ where: { id }, include: { peers: true } })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (appraisal.stage === "FINALIZED") {
    return NextResponse.json({ error: "Reopen the appraisal itself first (it is finalized)." }, { status: 400 })
  }

  const { target, peerId, raterId } = await req.json() as { target: string; peerId?: string; raterId?: string }

  if (target === "SELF") {
    await prisma.appraisal.update({ where: { id }, data: { stage: "DRAFT", submittedAt: null } })
  } else if (target === "PEER") {
    if (!peerId) return NextResponse.json({ error: "peerId required" }, { status: 400 })
    await prisma.appraisalPeer.updateMany({ where: { appraisalId: id, peerId }, data: { status: "PENDING", submittedAt: null } })
  } else if (target === "MEMBER") {
    if (!raterId) return NextResponse.json({ error: "raterId required" }, { status: 400 })
    await prisma.appraisalRating.deleteMany({ where: { appraisalId: id, raterId, raterType: "MEMBER" } })
  } else {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 })
  }

  await recomputeAndPersist(id)
  await logAudit({ req, actor: user, action: "APPRAISAL_REOPEN_REVIEW", entity: "Appraisal", entityId: id, newValues: { target, peerId, raterId } })
  return NextResponse.json({ ok: true })
}
