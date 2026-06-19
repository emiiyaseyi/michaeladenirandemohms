import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { UPLOADS_ENABLED, uploadsDisabledResponse } from "@/lib/uploads"

export async function POST(req: NextRequest) {
  if (!UPLOADS_ENABLED) return uploadsDisabledResponse()
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ error: "No employee profile linked" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Only JPG, PNG or WebP allowed" }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo must be under 5 MB" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${user.employeeId}_photo_${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "profile-photos")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  const photoUrl = `/uploads/profile-photos/${filename}`
  await prisma.employee.update({
    where: { id: user.employeeId },
    data: { profilePhoto: photoUrl },
  })

  await logAudit({
    req, actor: user, action: "EMPLOYEE_PHOTO_UPDATE", entity: "Employee", entityId: user.employeeId,
    targetUserId: user.id,
    newValues: { profilePhoto: photoUrl },
  })

  return NextResponse.json({ photoUrl })
}
