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
    // Orphan-upload fast path: filename is <uploaderUserId>_<uuid>.<ext>.
    // If the prefix matches the current user, they uploaded it — allow even before
    // any LeaveRequest references it (lets them preview during the apply form).
    const uploaderPrefix = filename.split("_")[0]
    const isUploader = !!uploaderPrefix && uploaderPrefix === user.id

    // The same document URL can appear as the top-level supportingDocument OR as a per-PL
    // handover document embedded in handoverNotes JSON. Search both.
    const leaveSelect = {
      employeeId: true,
      employee: { select: { projectLeadId: true, secondaryProjectLeadIds: true } },
      reliefOfficersList: { select: { employeeId: true } },
      approvals: { select: { employeeId: true, stage: true } },
      handoverNotes: true,
    } as const
    let leave = await prisma.leaveRequest.findFirst({
      where: { documentUrl: fileUrl },
      select: leaveSelect,
    })
    if (!leave) {
      const candidates = await prisma.leaveRequest.findMany({
        where: { handoverNotes: { contains: fileUrl } },
        select: leaveSelect,
      })
      leave = candidates.find(c => {
        try { return (JSON.parse(c.handoverNotes ?? "[]") as any[]).some(h => h.documentUrl === fileUrl) } catch { return false }
      }) ?? null
    }
    if (!leave) {
      // No request references this file yet — allow only the original uploader.
      if (isUploader) {
        // fall through to streaming
      } else {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
    } else {
      const isOwner = leave.employeeId === user.employeeId
      // Permanent-PL match (employee's standing primary/secondary projectLead)
      const isPermPL = !!user.employeeId && (
        leave.employee?.projectLeadId === user.employeeId ||
        (leave.employee?.secondaryProjectLeadIds ?? []).includes(user.employeeId)
      )
      // Per-request PL match: was the user picked as an approver on this specific request?
      const isApproverPL = !!user.employeeId && (leave.approvals ?? []).some(
        a => a.stage === "PROJECT_LEAD" && a.employeeId === user.employeeId
      )
      const isRelief = !!user.employeeId && (leave.reliefOfficersList ?? []).some(r => r.employeeId === user.employeeId)
      const isAdmin = user.role === "SUPER_ADMIN" || !!user.permissions["canViewAllLeave"]
      if (!isUploader && !isOwner && !isPermPL && !isApproverPL && !isRelief && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
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
