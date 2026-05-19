import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, JPG, and PNG files are accepted" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Filename: <uploaderUserId>_<uuid>.<ext>
  // Prefix lets the file-access gate recognize the uploader before any LeaveRequest exists.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf"
  const filename = `${user.id}_${randomUUID()}.${ext}`
  const uploadDir = path.join(process.cwd(), "private", "uploads", "leave-docs")

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  const url = `/api/files/leave-docs/${filename}`
  return NextResponse.json({ url })
}
