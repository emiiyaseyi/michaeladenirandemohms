import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { relationshipTo, recomputeAndPersist } from "@/lib/appraisal"
import { logAudit } from "@/lib/audit"

// Add a job-specific KPI row. KPI rows are admin-assigned (uploaded by HR) - only admins may add.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params
  const appraisal = await prisma.appraisal.findUnique({ where: { id }, include: { cycle: true, reviewers: true, peers: true } })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const rel = relationshipTo(user, appraisal)

  if (!rel.isAdmin) return NextResponse.json({ error: "KPI rows are managed by HR" }, { status: 400 })

  const { projectName, deliverable, kpi, weight } = await req.json()
  const sum = await prisma.appraisalKpi.aggregate({ where: { appraisalId: id }, _sum: { weight: true } })
  if ((sum._sum.weight ?? 0) + Number(weight ?? 0) > 100) {
    return NextResponse.json({ error: "Total job-specific weight cannot exceed 100" }, { status: 400 })
  }
  const max = await prisma.appraisalKpi.aggregate({ where: { appraisalId: id }, _max: { order: true } })
  const row = await prisma.appraisalKpi.create({
    data: { appraisalId: id, projectName, deliverable, kpi, weight: Number(weight ?? 0), source: "STAFF", order: (max._max.order ?? -1) + 1 },
  })
  if (rel.isSubject && appraisal.stage === "NOT_STARTED") await prisma.appraisal.update({ where: { id }, data: { stage: "DRAFT" } })
  await recomputeAndPersist(id)
  await logAudit({ req, actor: user, action: "APPRAISAL_KPI_ADD", entity: "AppraisalKpi", entityId: row.id })
  return NextResponse.json({ kpi: row }, { status: 201 })
}
