import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

const PRIVATE_ROOT = path.join(process.cwd(), "private", "uploads")
const ALLOWED_CATEGORIES = ["personal-docs", "kpi-evidence", "leave-docs"] as const
type Category = typeof ALLOWED_CATEGORIES[number]

const CONTENT_TYPES: Record<string, string> = {
  pdf:  "application/pdf",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  gif:  "image/gif",
  webp: "image/webp",
  doc:  "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls:  "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

/**
 * Gated file download.
 *
 *   GET /api/files/personal-docs/abc-123.pdf
 *   GET /api/files/kpi-evidence/xyz-456.pdf
 *   GET /api/files/leave-docs/def-789.jpg
 *
 * Files live in `private/uploads/{category}/` — NOT in `public/`, so the only
 * way to fetch them is through this auth + permission-checked endpoint.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const segments = (await params).path
  if (!segments || segments.length !== 2) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }
  const [category, filename] = segments

  if (!ALLOWED_CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 404 })
  }

  // Path-traversal guard
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\") || filename.startsWith(".")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
  }

  // Per-category permission check
  const fileUrl = `/api/files/${category}/${filename}`

  if (category === "personal-docs") {
    const doc = await prisma.personalDocument.findFirst({
      where: { fileUrl },
      select: { employeeId: true },
    })
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const isOwner = doc.employeeId === user.employeeId
    const isAdmin = user.role === "SUPER_ADMIN" || !!user.permissions["canViewPersonalDocuments"]
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (category === "kpi-evidence") {
    const kpi = await prisma.kPI.findFirst({
      where: { evidenceUrl: fileUrl },
      select: { employeeId: true, employee: { select: { projectLeadId: true, secondaryProjectLeadIds: true } } },
    })
    if (!kpi) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const isOwner = kpi.employeeId === user.employeeId
    const isPL = !!user.employeeId && (
      kpi.employee?.projectLeadId === user.employeeId ||
      (kpi.employee?.secondaryProjectLeadIds ?? []).includes(user.employeeId)
    )
    const isAdmin = user.role === "SUPER_ADMIN" || !!user.permissions["canViewPerformance"]
    if (!isOwner && !isPL && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (category === "leave-docs") {
    const leave = await prisma.leaveRequest.findFirst({
      where: { documentUrl: fileUrl },
      select: { employeeId: true, employee: { select: { projectLeadId: true, secondaryProjectLeadIds: true } } },
    })
    if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const isOwner = leave.employeeId === user.employeeId
    const isPL = !!user.employeeId && (
      leave.employee?.projectLeadId === user.employeeId ||
      (leave.employee?.secondaryProjectLeadIds ?? []).includes(user.employeeId)
    )
    const isAdmin = user.role === "SUPER_ADMIN" || !!user.permissions["canViewAllLeave"]
    if (!isOwner && !isPL && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Stream the file
  const filePath = path.join(PRIVATE_ROOT, category, filename)
  let data: Buffer
  try {
    data = await readFile(filePath)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const ext = path.extname(filename).toLowerCase().slice(1)
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream"

  return new NextResponse(data as any, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  })
}
