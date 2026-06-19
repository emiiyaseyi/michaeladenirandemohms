import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { peerCandidatesOf } from "@/lib/appraisal"

// Add a peer to an appraisal. Admin only. ?suggest=1 returns candidate project mates.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canAssignReviewers")
  if (perm) return perm
  const { id } = await params
  const appraisal = await prisma.appraisal.findUnique({ where: { id }, include: { peers: true, reviewers: true } })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (req.nextUrl.searchParams.get("suggest")) {
    const excluded = new Set<string>([appraisal.employeeId, ...appraisal.reviewers.map(r => r.reviewerId), ...appraisal.peers.map(p => p.peerId)])
    // Department-first order; cap the suggestion list. Keep that order in the response.
    const mateIds = (await peerCandidatesOf(appraisal.employeeId)).filter(m => !excluded.has(m)).slice(0, 12)
    const emps = await prisma.employee.findMany({ where: { id: { in: mateIds } }, select: { id: true, firstName: true, lastName: true, jobTitle: true } })
    const byId = new Map(emps.map(e => [e.id, e]))
    const candidates = mateIds.map(id => byId.get(id)).filter(Boolean)
    return NextResponse.json({ candidates })
  }

  const peers = await prisma.appraisalPeer.findMany({ where: { appraisalId: id }, include: { peer: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } } })
  return NextResponse.json({ peers })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canAssignReviewers")
  if (perm) return perm
  const { id } = await params
  const appraisal = await prisma.appraisal.findUnique({ where: { id }, select: { employeeId: true } })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const { peerId } = await req.json()
  if (!peerId) return NextResponse.json({ error: "peerId required" }, { status: 400 })
  if (peerId === appraisal.employeeId) return NextResponse.json({ error: "Cannot add the subject as their own peer" }, { status: 400 })
  const peer = await prisma.appraisalPeer.upsert({
    where: { appraisalId_peerId: { appraisalId: id, peerId } },
    create: { appraisalId: id, peerId },
    update: {},
  })
  await logAudit({ req, actor: user, action: "APPRAISAL_PEER_ADD", entity: "Appraisal", entityId: id, newValues: { peerId } })
  return NextResponse.json({ peer }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canAssignReviewers")
  if (perm) return perm
  const { id } = await params
  const peerId = req.nextUrl.searchParams.get("peerId")
  if (!peerId) return NextResponse.json({ error: "peerId required" }, { status: 400 })
  await prisma.appraisalPeer.deleteMany({ where: { appraisalId: id, peerId } })
  await logAudit({ req, actor: user, action: "APPRAISAL_PEER_REMOVE", entity: "Appraisal", entityId: id, newValues: { peerId } })
  return NextResponse.json({ ok: true })
}
