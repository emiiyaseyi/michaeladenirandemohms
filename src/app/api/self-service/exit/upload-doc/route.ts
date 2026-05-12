import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const MAX_SIZE = 1 * 1024 * 1024 // 1MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
]

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 1MB)" }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, DOC, DOCX, JPG, and PNG files are accepted" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf"
  const filename = `${Date.now()}_${user.id.slice(-8)}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "exit-docs")

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/exit-docs/${filename}` })
}
