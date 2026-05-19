import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManagePerformancePeriods")
  if (perm) return perm

  const { id } = await params
  const cycle = await prisma.performanceCycle.findUnique({ where: { id } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

  const body = await req.json()

  if (body.action === "activate") {
    await prisma.performanceCycle.updateMany({ where: { isActive: true }, data: { isActive: false } })
    const updated = await prisma.performanceCycle.update({ where: { id }, data: { isActive: true } })
    await logAudit({ req, actor: user, action: "PERFORMANCE_CYCLE_ACTIVATE", entity: "PerformanceCycle", entityId: id })
    return NextResponse.json({ cycle: updated })
  }

  if (body.action === "close") {
    const updated = await prisma.performanceCycle.update({ where: { id }, data: { isActive: false } })
    await logAudit({ req, actor: user, action: "PERFORMANCE_CYCLE_CLOSE", entity: "PerformanceCycle", entityId: id })
    return NextResponse.json({ cycle: updated })
  }

  const kpiCount = await prisma.kPI.count({ where: { cycleId: id } })
  if (kpiCount > 0) {
    return NextResponse.json({ error: "Cannot edit a cycle that already has KPIs" }, { status: 400 })
  }

  const { name, startDate, endDate, kpiDeadline } = body
  const updated = await prisma.performanceCycle.update({
    where: { id },
    data: {
      name: name ?? cycle.name,
      startDate: startDate ? new Date(startDate) : cycle.startDate,
      endDate: endDate ? new Date(endDate) : cycle.endDate,
      kpiDeadline: kpiDeadline !== undefined ? (kpiDeadline ? new Date(kpiDeadline) : null) : cycle.kpiDeadline,
    },
  })
  const diff = diffFields(cycle as any, updated as any, ["name", "startDate", "endDate", "kpiDeadline"])
  if (diff) await logAudit({ req, actor: user, action: "PERFORMANCE_CYCLE_EDIT", entity: "PerformanceCycle", entityId: id, oldValues: diff.old, newValues: diff.new })
  return NextResponse.json({ cycle: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManagePerformancePeriods")
  if (perm) return perm

  const { id } = await params
  const kpiCount = await prisma.kPI.count({ where: { cycleId: id } })
  if (kpiCount > 0) {
    return NextResponse.json({ error: "Cannot delete a cycle that has KPIs" }, { status: 400 })
  }

  const before = await prisma.performanceCycle.findUnique({ where: { id } })
  await prisma.performanceCycle.delete({ where: { id } })
  await logAudit({ req, actor: user, action: "PERFORMANCE_CYCLE_DELETE", entity: "PerformanceCycle", entityId: id, oldValues: before ?? undefined })
  return NextResponse.json({ ok: true })
}
