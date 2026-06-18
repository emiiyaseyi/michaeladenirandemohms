import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { relationshipTo } from "@/lib/appraisal"
import { logAudit } from "@/lib/audit"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { UPLOADS_ENABLED, uploadsDisabledResponse } from "@/lib/uploads"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]

// Upload evidence for a job-specific KPI row. Subject only, while their appraisal
// is editable (OPEN + NOT_STARTED/DRAFT). Stored privately; served via /api/files.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; kpiId: string }> }) {
  if (!UPLOADS_ENABLED) return uploadsDisabledResponse()
  const { user, error } = await requireAuth()
  if (error) return error
  const { id, kpiId } = await params

  const appraisal = await prisma.appraisal.findUnique({ where: { id }, include: { cycle: true, reviewers: true, peers: true } })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const row = await prisma.appraisalKpi.findUnique({ where: { id: kpiId } })
  if (!row || row.appraisalId !== id) return NextResponse.json({ error: "KPI not found" }, { status: 404 })
  const rel = relationshipTo(user, appraisal)
  const editable = rel.isSubject && appraisal.cycle?.stage === "OPEN" && (appraisal.stage === "NOT_STARTED" || appraisal.stage === "DRAFT")
  if (!editable && !rel.isAdmin) return NextResponse.json({ error: "Cannot upload evidence now" }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Only PDF, JPG, and PNG files are accepted" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf"
  const filename = `${user.id}_${randomUUID()}.${ext}`
  const uploadDir = path.join(process.cwd(), "private", "uploads", "kpi-evidence")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  const url = `/api/files/kpi-evidence/${filename}`
  await prisma.appraisalKpi.update({ where: { id: kpiId }, data: { evidenceUrl: url } })
  await logAudit({ req, actor: user, action: "APPRAISAL_KPI_EVIDENCE", entity: "AppraisalKpi", entityId: kpiId })
  return NextResponse.json({ url })
}
