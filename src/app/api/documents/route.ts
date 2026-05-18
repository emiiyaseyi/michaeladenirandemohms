import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = caps(user.role).canViewAllEmployees

  const all = req.nextUrl.searchParams.get("all") === "true"
  // Non-admins only see docs that are active AND have canView=true.
  // canDownload + canCopy are surfaced on the row for the UI to enforce
  // (download button + copy-protection styling).
  const docs = await prisma.orgDocument.findMany({
    where: isAdmin && all
      ? {}
      : isAdmin
        ? { isActive: true }
        : { isActive: true, canView: true },
    include: {
      uploadedBy: { select: { name: true } },
      acknowledgments: {
        where: isAdmin ? {} : { employee: { userId: user.id } },
        select: { employeeId: true, acknowledged: true, acknowledgedAt: true },
      },
      _count: { select: { acknowledgments: { where: { acknowledged: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  // For employee view, attach their own ack status
  if (!isAdmin) {
    const emp = await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } })
    const enriched = docs.map(doc => ({
      ...doc,
      myAck: doc.acknowledgments.find((a: any) => a.employeeId === emp?.id) ?? null,
    }))
    return NextResponse.json({ docs: enriched, isAdmin: false })
  }

  // For admin: also get total employee count for ack ratio
  const totalEmployees = await prisma.employee.count({ where: { employeeStatus: "ACTIVE" } })
  return NextResponse.json({ docs, isAdmin: true, totalEmployees })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (!caps(user.role).canViewAllEmployees) return forbidden("Only admins can upload documents")

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const title = formData.get("title") as string
  const category = (formData.get("category") as string) || "OTHER"
  const description = formData.get("description") as string | null
  const canView = formData.get("canView") !== "false"
  const canDownload = formData.get("canDownload") === "true"
  const requiresAck = formData.get("requiresAck") === "true"
  const canCopy = formData.get("canCopy") !== "false"
  const requiresSignature = formData.get("requiresSignature") === "true"
  const sentToCurrentEmployees = formData.get("sentToCurrentEmployees") === "true"
  const includeInOnboarding = formData.get("includeInOnboarding") === "true"

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })
  if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf"
  const filename = `${Date.now()}_${user.id.slice(-8)}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "org-docs")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  const doc = await prisma.orgDocument.create({
    data: {
      title,
      category: category as any,
      description: description || null,
      fileUrl: `/uploads/org-docs/${filename}`,
      fileSize: file.size,
      mimeType: file.type,
      canView,
      canDownload,
      requiresAck,
      canCopy,
      requiresSignature,
      sentToCurrentEmployees,
      includeInOnboarding,
      sentAt: sentToCurrentEmployees ? new Date() : null,
      uploadedById: user.id,
    },
    include: { uploadedBy: { select: { name: true } } },
  })

  return NextResponse.json({ doc }, { status: 201 })
}
