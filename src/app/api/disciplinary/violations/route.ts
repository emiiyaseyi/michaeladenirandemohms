import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const ALLOWED = ["application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png", "image/jpeg"]
const MAX_BYTES = 15 * 1024 * 1024

async function saveFile(file: File, folder: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buf = Buffer.from(bytes)
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
  const dir = path.join(process.cwd(), "public", "uploads", folder)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, name), buf)
  return `/uploads/${folder}/${name}`
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""
  const view   = searchParams.get("view") ?? ""  // "for_me" | "by_me"

  const isAdmin = caps(user.role).canViewAllEmployees

  // Build where clause
  const where: any = {}

  if (view === "for_me" && user.employeeId) {
    where.employeeId = user.employeeId
  } else if (view === "by_me" && user.employeeId) {
    where.recordedById = user.employeeId
  } else if (!isAdmin) {
    // Staff with no view param: return nothing
    return NextResponse.json({ violations: [] })
  }

  if (status && status !== "ALL") where.status = status as any

  if (search) {
    where.OR = [
      { employee: { firstName: { contains: search, mode: "insensitive" } } },
      { employee: { lastName: { contains: search, mode: "insensitive" } } },
      { violationType: { name: { contains: search, mode: "insensitive" } } },
    ]
  }

  const violations = await prisma.violation.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
      violationType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ violations })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (!user.employeeId) return NextResponse.json({ error: "No employee record linked to your account" }, { status: 400 })

  const form = await req.formData()
  const employeeId      = form.get("employeeId") as string
  const violationTypeId = form.get("violationTypeId") as string
  const incidentDate    = form.get("incidentDate") as string
  const details         = form.get("details") as string
  const expectingResponse = form.get("expectingResponse") === "true"

  if (!employeeId || !violationTypeId || !incidentDate || !details?.trim())
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

  let supportingDocUrl: string | null = null
  const doc = form.get("supportingDoc") as File | null
  if (doc && doc.size > 0) {
    if (!ALLOWED.includes(doc.type))
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    if (doc.size > MAX_BYTES)
      return NextResponse.json({ error: "File exceeds 15MB" }, { status: 400 })
    supportingDocUrl = await saveFile(doc, "violations")
  }

  const violation = await prisma.violation.create({
    data: {
      employeeId,
      recordedById: user.employeeId,
      violationTypeId,
      incidentDate: new Date(incidentDate),
      details,
      expectingResponse,
      supportingDocUrl,
    },
  })

  const targetEmp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } })
  await logAudit({
    req, actor: user, action: "VIOLATION_CREATE", entity: "Violation", entityId: violation.id,
    targetUserId: targetEmp?.userId ?? null,
    newValues: { violationTypeId, incidentDate, details, expectingResponse },
  })

  return NextResponse.json({ violation }, { status: 201 })
}
