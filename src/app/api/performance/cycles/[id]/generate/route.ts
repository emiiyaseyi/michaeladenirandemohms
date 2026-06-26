import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { notifyCycleOpened } from "@/lib/appraisal-notify"

// Generate appraisal records for all active employees in this cycle, then open it.
//  - One Appraisal per active employee (idempotent - skips existing).
//  - Primary reviewer = employee's project lead (fallback: manager).
//  - Injects the cycle's global KPI rows (Learning & Dev, Brand) as ADMIN-source job rows.
//  - Moves the cycle stage CONFIG → OPEN.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm

  const { id } = await params
  const cycle = await prisma.performanceCycle.findUnique({ where: { id }, include: { globalKpis: { orderBy: { order: "asc" } } } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

  const employees = await prisma.employee.findMany({
    where: { employeeStatus: "ACTIVE" },
    select: { id: true, projectLeadId: true, managerId: true },
  })
  const existing = await prisma.appraisal.findMany({ where: { cycleId: id }, select: { employeeId: true } })
  const existingIds = new Set(existing.map(e => e.employeeId))

  let created = 0
  const newEmployeeIds: string[] = []
  for (const emp of employees) {
    if (existingIds.has(emp.id)) continue
    const primaryReviewerId = emp.projectLeadId ?? emp.managerId ?? null
    await prisma.appraisal.create({
      data: {
        cycleId: id,
        employeeId: emp.id,
        stage: "NOT_STARTED",
        kpis: {
          create: cycle.globalKpis.map(g => ({
            projectName: g.projectName, deliverable: g.deliverable, kpi: g.kpi,
            weight: g.weight, source: "ADMIN" as const, order: g.order,
          })),
        },
        ...(primaryReviewerId && primaryReviewerId !== emp.id
          ? { reviewers: { create: { reviewerId: primaryReviewerId, role: "PRIMARY" as const } } }
          : {}),
      },
    })
    created++
    newEmployeeIds.push(emp.id)
  }

  await prisma.performanceCycle.update({ where: { id }, data: { stage: "OPEN" } })
  await notifyCycleOpened(newEmployeeIds, cycle.name)
  await logAudit({ req, actor: user, action: "APPRAISAL_CYCLE_GENERATE", entity: "PerformanceCycle", entityId: id, newValues: { created } })
  return NextResponse.json({ ok: true, created })
}
