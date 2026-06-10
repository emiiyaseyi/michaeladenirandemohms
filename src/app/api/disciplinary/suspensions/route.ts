import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { UPLOADS_ENABLED, uploadsDisabledResponse } from "@/lib/uploads"

const ALLOWED = ["application/pdf","application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png","image/jpeg"]
const MAX_BYTES = 1 * 1024 * 1024

async function saveFile(file: File, folder: string) {
  const bytes = await file.arrayBuffer()
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
  const name = `${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`
  const dir = path.join(process.cwd(),"public","uploads",folder)
  await mkdir(dir,{recursive:true})
  await writeFile(path.join(dir,name),Buffer.from(bytes))
  return `/uploads/${folder}/${name}`
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewDisciplinary")
  if (perm) return perm

  const { searchParams } = new URL(req.url)
  const tab    = searchParams.get("tab") ?? "suspensions"   // "suspensions" | "schedules"
  const status = searchParams.get("status") ?? ""
  const search = searchParams.get("search") ?? ""

  const isSchedule = tab === "schedules"

  const where: any = {
    alreadyOccurred: !isSchedule,
    ...(status && status !== "ALL" ? { status: status as any } : {}),
    ...(search ? {
      employee: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName:  { contains: search, mode: "insensitive" } },
        ],
      },
    } : {}),
  }

  const suspensions = await prisma.suspension.findMany({
    where,
    include: { employee: { select: { id:true, firstName:true, lastName:true, profilePhoto:true, jobTitle:true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ suspensions })
}

export async function POST(req: NextRequest) {
  if (!UPLOADS_ENABLED) return uploadsDisabledResponse()
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewDisciplinary")
  if (perm) return perm

  const form = await req.formData()
  const employeeId      = form.get("employeeId") as string
  const startDate       = form.get("startDate") as string
  const endDate         = form.get("endDate") as string | null
  const reason          = (form.get("reason") as string) || null
  const noteForUser     = (form.get("noteForUser") as string) || null
  const alreadyOccurred = form.get("alreadyOccurred") === "true"

  if (!employeeId || !startDate)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

  let supportingDocUrl: string | null = null
  const doc = form.get("supportingDoc") as File | null
  if (doc && doc.size > 0) {
    if (!ALLOWED.includes(doc.type))
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    if (doc.size > MAX_BYTES)
      return NextResponse.json({ error: "File exceeds 1MB" }, { status: 400 })
    supportingDocUrl = await saveFile(doc, "suspensions")
  }

  const status = alreadyOccurred ? "TO_REVIEW" : "PENDING"

  const suspension = await prisma.suspension.create({
    data: {
      employeeId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      reason,
      noteForUser,
      supportingDocUrl,
      alreadyOccurred,
      status: status as any,
    },
  })

  const targetEmp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } })
  await logAudit({
    req, actor: user, action: "SUSPENSION_CREATE", entity: "Suspension", entityId: suspension.id,
    targetUserId: targetEmp?.userId ?? null,
    newValues: { startDate, endDate, alreadyOccurred, status },
    reason,
  })

  return NextResponse.json({ suspension }, { status: 201 })
}
