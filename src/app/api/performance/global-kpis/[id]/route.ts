import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const f of ["projectName", "deliverable", "kpi"]) if (body[f] !== undefined) data[f] = body[f]
  if (body.weight !== undefined) data.weight = Number(body.weight)
  if (body.order !== undefined) data.order = Number(body.order)
  const globalKpi = await prisma.appraisalGlobalKpi.update({ where: { id }, data })
  await logAudit({ req, actor: user, action: "APPRAISAL_GLOBAL_KPI_EDIT", entity: "AppraisalGlobalKpi", entityId: id })
  return NextResponse.json({ globalKpi })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm
  const { id } = await params
  await prisma.appraisalGlobalKpi.delete({ where: { id } })
  await logAudit({ req, actor: user, action: "APPRAISAL_GLOBAL_KPI_DELETE", entity: "AppraisalGlobalKpi", entityId: id })
  return NextResponse.json({ ok: true })
}
