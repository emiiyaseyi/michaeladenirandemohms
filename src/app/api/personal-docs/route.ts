import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

const VALID_TYPES = ["SSCE", "FIRST_DEGREE", "NYSC", "PROFESSIONAL_CERT", "UTILITY_BILL", "OTHER"]

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const isAdmin = caps(user.role).canViewAllEmployees
  const empIdParam = req.nextUrl.searchParams.get("employeeId")
  const statusParam = req.nextUrl.searchParams.get("status")

  // Admin fetching all docs (no employeeId filter)
  if (isAdmin && !empIdParam) {
    const where: any = {}
    if (statusParam) where.status = statusParam
    const docs = await prisma.personalDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: { select: { name: true } },
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, jobTitle: true, profilePhoto: true, department: { select: { name: true } } } },
      },
    })
    return NextResponse.json({ docs })
  }

  let empId: string | undefined

  if (isAdmin && empIdParam) {
    empId = empIdParam
  } else {
    empId = user.employeeId
    if (!empId) {
      const emp = await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } })
      empId = emp?.id
    }
  }

  if (!empId) return NextResponse.json({ docs: [] })

  const docs = await prisma.personalDocument.findMany({
    where: { employeeId: empId },
    orderBy: { type: "asc" },
    include: { reviewer: { select: { name: true } } },
  })
  return NextResponse.json({ docs })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let empId = user.employeeId
  if (!empId) {
    const emp = await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } })
    empId = emp?.id
  }
  if (!empId) return NextResponse.json({ error: "No employee profile" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const type = formData.get("type") as string
  const notes = formData.get("notes") as string | null

  if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 })
  if (!type || !VALID_TYPES.includes(type)) return NextResponse.json({ error: "Invalid document type" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split(".").pop() ?? "pdf"
  const filename = `${empId}_${type}_${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "personal-docs")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  // If replacing an existing doc of the same type, soft-delete the old one
  await prisma.personalDocument.deleteMany({ where: { employeeId: empId, type: type as any } })

  const doc = await prisma.personalDocument.create({
    data: {
      employeeId: empId,
      type: type as any,
      fileUrl: `/uploads/personal-docs/${filename}`,
      fileName: file.name,
      notes: notes || null,
      status: "PENDING",
    },
    include: { reviewer: { select: { name: true } } },
  })

  // Notify admins
  const admins = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN"] }, isActive: true },
    select: { id: true },
  })
  if (admins.length > 0) {
    const emp = await prisma.employee.findUnique({ where: { id: empId }, select: { firstName: true, lastName: true } })
    const typeLabel: Record<string, string> = {
      SSCE: "SSCE Certificate", FIRST_DEGREE: "First Degree", NYSC: "NYSC Certificate",
      PROFESSIONAL_CERT: "Professional Certificate", UTILITY_BILL: "Utility Bill", OTHER: "Document",
    }
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.id, employeeId: empId!,
        title: "Personal Document Uploaded",
        message: `${emp?.firstName} ${emp?.lastName} uploaded a ${typeLabel[type] ?? type} for review.`,
        type: "INFO" as const,
        link: `/employees/personal-docs`,
      })),
    })
  }

  return NextResponse.json({ doc }, { status: 201 })
}
