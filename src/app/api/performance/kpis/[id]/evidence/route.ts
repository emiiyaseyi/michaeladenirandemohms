import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { UPLOADS_ENABLED, uploadsDisabledResponse } from "@/lib/uploads"

const ALLOWED = ["pdf", "jpeg", "jpg", "png", "docx", "xlsx"]
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!UPLOADS_ENABLED) return uploadsDisabledResponse()
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return forbidden("No employee linked to this account")

  const { id } = await params
  const kpi = await prisma.kPI.findUnique({ where: { id } })
  if (!kpi) return NextResponse.json({ error: "KPI not found" }, { status: 404 })
  if (kpi.employeeId !== user.employeeId) return forbidden()

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: `File type not allowed. Allowed: ${ALLOWED.join(", ")}` }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), "private", "uploads", "kpi-evidence")
  await mkdir(uploadDir, { recursive: true })
  // Unguessable filename + private directory (gated via /api/files/[...path])
  const filename = `${crypto.randomUUID()}.${ext}`
  await writeFile(path.join(uploadDir, filename), buffer)

  const evidenceUrl = `/api/files/kpi-evidence/${filename}`
  const updated = await prisma.kPI.update({ where: { id }, data: { evidenceUrl } })

  await logAudit({
    req, actor: user, action: "KPI_EVIDENCE_UPLOAD", entity: "KPI", entityId: id,
    targetUserId: user.id,
    newValues: { evidenceUrl, fileName: file.name },
  })

  return NextResponse.json({ kpi: updated })
}
