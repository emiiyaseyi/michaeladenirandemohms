import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { parseCSV } from "@/lib/csv"
import { recomputeAndPersist } from "@/lib/appraisal"
import { logAudit } from "@/lib/audit"

// Import the admin leaderboard for org-wide admin-scored items.
// Columns: email, category, score, note
//   category ∈ BRAND | LEARNING | ATTENDANCE
// Upserts a LeaderboardEntry per row AND drives the actual appraisal admin scores:
//   BRAND/LEARNING → the matching ADMIN-source KPI row's employeeScore (clamped to its weight)
//   ATTENDANCE     → an ADMIN rating on the admin-scored attendance core-value question(s)
const CATEGORIES = ["BRAND", "LEARNING", "ATTENDANCE"] as const
type Category = typeof CATEGORIES[number]

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

  const headers = Object.keys(rows[0])
  for (const c of ["email", "category", "score"]) if (!headers.includes(c)) {
    return NextResponse.json({ error: `Missing required column "${c}". Expected: email, category, score, note.` }, { status: 400 })
  }

  // Admin-scored attendance question(s) for this cycle (for ATTENDANCE category).
  const adminQuestions = await prisma.appraisalQuestion.findMany({
    where: { cycleId: id, section: "CORE_VALUE", adminScored: true },
    orderBy: { order: "asc" },
  })
  const attendanceQuestions = adminQuestions.filter(q => /attendance/i.test(q.text))
  const attendanceTargets = attendanceQuestions.length ? attendanceQuestions : adminQuestions

  const matched: string[] = []
  const skipped: { email: string; reason: string }[] = []
  const touched = new Set<string>()

  for (const r of rows) {
    const email = (r.email ?? "").toLowerCase().trim()
    const category = (r.category ?? "").toUpperCase().trim() as Category
    const score = Number(r.score)
    const note = (r.note ?? "").trim() || null
    if (!email) { continue }
    if (!CATEGORIES.includes(category)) { skipped.push({ email, reason: `bad category "${r.category}"` }); continue }
    if (Number.isNaN(score)) { skipped.push({ email, reason: "score not a number" }); continue }

    const employee = await prisma.employee.findFirst({
      where: { user: { email: { equals: email, mode: "insensitive" } } },
      select: { id: true },
    })
    if (!employee) { skipped.push({ email, reason: "no matching employee" }); continue }

    // 1) Leaderboard entry (display + audit trail).
    await prisma.leaderboardEntry.upsert({
      where: { cycleId_category_employeeId: { cycleId: id, category, employeeId: employee.id } },
      create: { cycleId: id, category, employeeId: employee.id, score, note },
      update: { score, note },
    })

    // 2) Drive the appraisal admin score.
    const appraisal = await prisma.appraisal.findUnique({
      where: { cycleId_employeeId: { cycleId: id, employeeId: employee.id } },
      select: { id: true },
    })
    if (appraisal) {
      if (category === "BRAND" || category === "LEARNING") {
        const keyword = category === "BRAND" ? "brand" : "learning"
        const kpi = await prisma.appraisalKpi.findFirst({
          where: { appraisalId: appraisal.id, source: "ADMIN", projectName: { contains: keyword, mode: "insensitive" } },
        })
        if (kpi) {
          const clamped = Math.max(0, Math.min(Number(kpi.weight) || 0, score))
          await prisma.appraisalKpi.update({ where: { id: kpi.id }, data: { employeeScore: clamped, employeeComment: note ?? kpi.employeeComment } })
        }
      } else {
        // ATTENDANCE → ADMIN rating on the attendance core-value question(s).
        for (const q of attendanceTargets) {
          const clamped = Math.max(0, Math.min(q.scaleMax, score))
          const existing = await prisma.appraisalRating.findFirst({ where: { appraisalId: appraisal.id, raterType: "ADMIN", section: "CORE_VALUE", questionId: q.id } })
          if (existing) await prisma.appraisalRating.update({ where: { id: existing.id }, data: { score: clamped, comment: note, isAnonymous: false } })
          else await prisma.appraisalRating.create({ data: { appraisalId: appraisal.id, raterType: "ADMIN", section: "CORE_VALUE", questionId: q.id, score: clamped, comment: note, isAnonymous: false } })
        }
      }
      touched.add(appraisal.id)
    }
    matched.push(`${email}:${category}`)
  }

  for (const aid of touched) await recomputeAndPersist(aid)
  await logAudit({ req, actor: user, action: "APPRAISAL_IMPORT_LEADERBOARD", entity: "PerformanceCycle", entityId: id, newValues: { matched: matched.length, skipped: skipped.length } })
  return NextResponse.json({ ok: true, matched: matched.length, skipped })
}
