import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { parseCSV } from "@/lib/csv"
import { recomputeAndPersist } from "@/lib/appraisal"
import { logAudit } from "@/lib/audit"

// Import per-staff job-specific KPIs from a CSV at the start of a cycle.
// Columns: email, projectName, deliverable, kpi, weight
// Rows are grouped by email; for each matched employee's appraisal in this cycle the
// existing STAFF-source KPI rows are REPLACED with the uploaded rows. ADMIN-source rows
// (Brand, Learning & Development) are left untouched. Staff then self-score; reviewers score.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAppraisalCycles")
  if (perm) return perm

  const { id } = await params
  const cycle = await prisma.performanceCycle.findUnique({ where: { id } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  const rows = parseCSV(await file.text())
  if (!rows.length) return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 })

  const REQUIRED = ["email", "projectName", "weight"]
  const headers = Object.keys(rows[0])
  for (const c of REQUIRED) if (!headers.includes(c)) {
    return NextResponse.json({ error: `Missing required column "${c}". Expected: email, projectName, deliverable, kpi, weight.` }, { status: 400 })
  }

  // Group rows by lower-cased email.
  const byEmail = new Map<string, { projectName: string; deliverable: string; kpi: string; weight: number }[]>()
  for (const r of rows) {
    const email = (r.email ?? "").toLowerCase().trim()
    if (!email || !r.projectName?.trim()) continue
    const list = byEmail.get(email) ?? []
    list.push({
      projectName: r.projectName.trim(),
      deliverable: (r.deliverable ?? "").trim(),
      kpi: (r.kpi ?? "").trim(),
      weight: Number(r.weight ?? 0) || 0,
    })
    byEmail.set(email, list)
  }

  const matched: string[] = []
  const skipped: { email: string; reason: string }[] = []
  const warnings: string[] = []

  for (const [email, items] of byEmail) {
    const employee = await prisma.employee.findFirst({
      where: { user: { email: { equals: email, mode: "insensitive" } } },
      select: { id: true },
    })
    if (!employee) { skipped.push({ email, reason: "no matching employee" }); continue }
    const appraisal = await prisma.appraisal.findUnique({
      where: { cycleId_employeeId: { cycleId: id, employeeId: employee.id } },
      select: { id: true, kpis: { where: { source: "ADMIN" }, select: { weight: true } } },
    })
    if (!appraisal) { skipped.push({ email, reason: "no appraisal in this cycle" }); continue }

    const staffTotal = items.reduce((s, it) => s + it.weight, 0)
    const adminTotal = appraisal.kpis.reduce((s, k) => s + (k.weight ?? 0), 0)
    if (staffTotal + adminTotal !== 100) {
      warnings.push(`${email}: weights total ${staffTotal + adminTotal} (staff ${staffTotal} + admin ${adminTotal}), expected 100`)
    }

    // Replace existing STAFF rows.
    await prisma.appraisalKpi.deleteMany({ where: { appraisalId: appraisal.id, source: "STAFF" } })
    await prisma.appraisalKpi.createMany({
      data: items.map((it, i) => ({
        appraisalId: appraisal.id,
        projectName: it.projectName, deliverable: it.deliverable || null, kpi: it.kpi || null,
        weight: it.weight, source: "STAFF" as const, order: i,
      })),
    })
    await recomputeAndPersist(appraisal.id)
    matched.push(email)
  }

  await logAudit({ req, actor: user, action: "APPRAISAL_IMPORT_KPIS", entity: "PerformanceCycle", entityId: id, newValues: { matched: matched.length, skipped: skipped.length } })
  return NextResponse.json({ ok: true, matched: matched.length, skipped, warnings })
}
