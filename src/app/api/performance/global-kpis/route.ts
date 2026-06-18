import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const cycleId = req.nextUrl.searchParams.get("cycleId")
  if (!cycleId) return NextResponse.json({ error: "cycleId required" }, { status: 400 })
  const globalKpis = await prisma.appraisalGlobalKpi.findMany({ where: { cycleId }, orderBy: { order: "asc" } })
  return NextResponse.json({ globalKpis })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm
  const { cycleId, projectName, deliverable, kpi, weight } = await req.json()
  if (!cycleId || !projectName) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  const max = await prisma.appraisalGlobalKpi.aggregate({ where: { cycleId }, _max: { order: true } })
  const globalKpi = await prisma.appraisalGlobalKpi.create({
    data: { cycleId, projectName, deliverable: deliverable ?? null, kpi: kpi ?? null, weight: Number(weight ?? 0), order: (max._max.order ?? -1) + 1 },
  })
  await logAudit({ req, actor: user, action: "APPRAISAL_GLOBAL_KPI_CREATE", entity: "AppraisalGlobalKpi", entityId: globalKpi.id })
  return NextResponse.json({ globalKpi }, { status: 201 })
}
