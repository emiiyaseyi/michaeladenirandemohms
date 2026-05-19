import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewAllEmployees) return forbidden()

  const { id } = await params

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Only JPG, PNG or WebP allowed" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${id}_photo_${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "profile-photos")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  const photoUrl = `/uploads/profile-photos/${filename}`
  const updated = await prisma.employee.update({ where: { id }, data: { profilePhoto: photoUrl }, select: { userId: true } })

  await logAudit({
    req, actor: user, action: "EMPLOYEE_PHOTO_UPDATE", entity: "Employee", entityId: id,
    targetUserId: updated.userId,
    newValues: { profilePhoto: photoUrl },
  })

  return NextResponse.json({ photoUrl })
}
