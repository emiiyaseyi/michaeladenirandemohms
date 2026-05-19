import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return forbidden("No employee linked to this account")

  const { id } = await params
  const kpi = await prisma.kPI.findUnique({
    where: { id },
    include: { employee: { select: { projectLeadId: true, userId: true } } },
  })
  if (!kpi) return NextResponse.json({ error: "KPI not found" }, { status: 404 })

  const body = await req.json()
  const { action } = body
  const ownerUserId = (kpi.employee as any)?.userId ?? null

  const isOwner = kpi.employeeId === user.employeeId
  const isAdmin = user.role === "SUPER_ADMIN" || user.permissions["canManagePerformancePeriods"] || user.permissions["canViewPerformance"]
  const isPL = user.role === "PROJECT_LEAD" && (kpi.employee as any)?.projectLeadId === user.employeeId

  if (action === "approve") {
    if (!isAdmin && !isPL) return forbidden()
    const updated = await prisma.kPI.update({ where: { id }, data: { status: "APPROVED" } })
    await logAudit({ req, actor: user, action: "KPI_APPROVE", entity: "KPI", entityId: id, targetUserId: ownerUserId })
    return NextResponse.json({ kpi: updated })
  }

  if (action === "approve_with_correction") {
    if (!isAdmin && !isPL) return forbidden()
    const updated = await prisma.kPI.update({ where: { id }, data: { status: "APPROVED_WITH_CORRECTION", comments: body.comments ?? kpi.comments } })
    await logAudit({ req, actor: user, action: "KPI_APPROVE_WITH_CORRECTION", entity: "KPI", entityId: id, targetUserId: ownerUserId, reason: body.comments ?? null })
    return NextResponse.json({ kpi: updated })
  }

  if (action === "reject") {
    if (!isAdmin && !isPL) return forbidden()
    const updated = await prisma.kPI.update({ where: { id }, data: { status: "REJECTED", comments: body.comments ?? kpi.comments } })
    await logAudit({ req, actor: user, action: "KPI_REJECT", entity: "KPI", entityId: id, targetUserId: ownerUserId, reason: body.comments ?? null })
    return NextResponse.json({ kpi: updated })
  }

  if (action === "needs_clarification") {
    if (!isAdmin && !isPL) return forbidden()
    const updated = await prisma.kPI.update({ where: { id }, data: { status: "NEEDS_CLARIFICATION", comments: body.comments ?? kpi.comments } })
    await logAudit({ req, actor: user, action: "KPI_NEEDS_CLARIFICATION", entity: "KPI", entityId: id, targetUserId: ownerUserId, reason: body.comments ?? null })
    return NextResponse.json({ kpi: updated })
  }

  if (action === "self_score") {
    if (!isOwner) return forbidden()
    const updated = await prisma.kPI.update({
      where: { id },
      data: {
        selfScore: body.selfScore !== undefined ? Number(body.selfScore) : kpi.selfScore,
        progress: body.progress !== undefined ? Number(body.progress) : kpi.progress,
        kpiStatus: body.kpiStatus ?? kpi.kpiStatus,
      },
    })
    await logAudit({ req, actor: user, action: "KPI_SELF_SCORE", entity: "KPI", entityId: id, targetUserId: ownerUserId, newValues: { selfScore: updated.selfScore, progress: updated.progress, kpiStatus: updated.kpiStatus } })
    return NextResponse.json({ kpi: updated })
  }

  if (action === "manager_score") {
    if (!isAdmin && !isPL) return forbidden()
    const updated = await prisma.kPI.update({
      where: { id },
      data: { managerScore: body.managerScore !== undefined ? Number(body.managerScore) : kpi.managerScore, comments: body.comments ?? kpi.comments },
    })
    await logAudit({ req, actor: user, action: "KPI_MANAGER_SCORE", entity: "KPI", entityId: id, targetUserId: ownerUserId, newValues: { managerScore: updated.managerScore }, reason: body.comments ?? null })
    return NextResponse.json({ kpi: updated })
  }

  if (action === "final_score") {
    if (!isAdmin) return forbidden()
    const updated = await prisma.kPI.update({
      where: { id },
      data: { finalScore: body.finalScore !== undefined ? Number(body.finalScore) : kpi.finalScore, comments: body.comments ?? kpi.comments },
    })
    await logAudit({ req, actor: user, action: "KPI_FINAL_SCORE", entity: "KPI", entityId: id, targetUserId: ownerUserId, newValues: { finalScore: updated.finalScore }, reason: body.comments ?? null })
    return NextResponse.json({ kpi: updated })
  }

  // Plain field update (owner editing their own KPI)
  if (!isOwner) return forbidden()

  const editableStatuses = ["DRAFT", "SUBMITTED", "REJECTED", "NEEDS_CLARIFICATION"]
  if (!editableStatuses.includes(kpi.status as string)) {
    return NextResponse.json({ error: "Cannot edit an approved KPI" }, { status: 400 })
  }

  const updated = await prisma.kPI.update({
    where: { id },
    data: {
      title:         body.title         !== undefined ? body.title         : kpi.title,
      keyResultArea: body.keyResultArea  !== undefined ? body.keyResultArea  : kpi.keyResultArea,
      weight:        body.weight         !== undefined ? Number(body.weight) : kpi.weight,
      target:        body.target         !== undefined ? body.target         : kpi.target,
      deadline:      body.deadline       !== undefined ? (body.deadline ? new Date(body.deadline) : null) : kpi.deadline,
      projectName:   body.projectName    !== undefined ? body.projectName    : kpi.projectName,
      description:   body.description    !== undefined ? body.description    : kpi.description,
      status:        "SUBMITTED",
    },
    include: { employee: true },
  })
  return NextResponse.json({ kpi: updated })
}
