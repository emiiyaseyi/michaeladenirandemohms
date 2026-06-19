import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

// Assign / replace a reviewer (PRIMARY or COUNTER) for an appraisal. Admin only.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canAssignReviewers")
  if (perm) return perm

  const { id } = await params
  const appraisal = await prisma.appraisal.findUnique({ where: { id }, select: { id: true, employeeId: true } })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { reviewerId, role } = await req.json()
  if (!reviewerId || !["PRIMARY", "COUNTER"].includes(role)) return NextResponse.json({ error: "reviewerId and valid role required" }, { status: 400 })
  if (reviewerId === appraisal.employeeId) return NextResponse.json({ error: "An employee cannot review themselves" }, { status: 400 })

  // upsert the single row for this role
  const existing = await prisma.appraisalReviewer.findFirst({ where: { appraisalId: id, role: role as any } })
  let reviewer
  if (existing) {
    reviewer = await prisma.appraisalReviewer.update({ where: { id: existing.id }, data: { reviewerId, submittedAt: null } })
  } else {
    reviewer = await prisma.appraisalReviewer.create({ data: { appraisalId: id, reviewerId, role: role as any } })
  }
  await logAudit({ req, actor: user, action: "APPRAISAL_REVIEWER_ASSIGN", entity: "Appraisal", entityId: id, newValues: { reviewerId, role } })
  return NextResponse.json({ reviewer }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canAssignReviewers")
  if (perm) return perm
  const { id } = await params
  const role = req.nextUrl.searchParams.get("role")
  if (!role) return NextResponse.json({ error: "role required" }, { status: 400 })
  await prisma.appraisalReviewer.deleteMany({ where: { appraisalId: id, role: role as any } })
  await logAudit({ req, actor: user, action: "APPRAISAL_REVIEWER_REMOVE", entity: "Appraisal", entityId: id, newValues: { role } })
  return NextResponse.json({ ok: true })
}
