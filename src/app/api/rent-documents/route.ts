import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const ALLOWED = ["application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png", "image/jpeg"]
const MAX_BYTES = 1 * 1024 * 1024

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
  const perm = requirePermission(user, "canViewRentDocuments")
  if (perm) return perm

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""

  const docs = await prisma.rentDocument.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(search ? {
        employee: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        },
      } : {}),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ docs })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const form = await req.formData()
  const employeeId = form.get("employeeId") as string
  const amount = parseFloat(form.get("amount") as string)
  const rentStart = new Date(form.get("rentStart") as string)
  const rentEnd = new Date(form.get("rentEnd") as string)
  const propertyAddress = form.get("propertyAddress") as string
  const landlordName = (form.get("landlordName") as string) || null
  const landlordPhone = (form.get("landlordPhone") as string) || null
  const landlordEmail = (form.get("landlordEmail") as string) || null

  if (!employeeId || isNaN(amount) || !propertyAddress)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

  let rentReceiptUrl: string | null = null
  let tenancyAgreementUrl: string | null = null

  const receipt = form.get("rentReceipt") as File | null
  if (receipt && receipt.size > 0) {
    if (!ALLOWED.includes(receipt.type)) return NextResponse.json({ error: "Invalid file type for rent receipt" }, { status: 400 })
    if (receipt.size > MAX_BYTES) return NextResponse.json({ error: "Rent receipt exceeds 1MB" }, { status: 400 })
    rentReceiptUrl = await saveFile(receipt, "rent-documents")
  }
  const tenancy = form.get("tenancyAgreement") as File | null
  if (tenancy && tenancy.size > 0) {
    if (!ALLOWED.includes(tenancy.type)) return NextResponse.json({ error: "Invalid file type for tenancy agreement" }, { status: 400 })
    if (tenancy.size > MAX_BYTES) return NextResponse.json({ error: "Tenancy agreement exceeds 1MB" }, { status: 400 })
    tenancyAgreementUrl = await saveFile(tenancy, "rent-documents")
  }

  const doc = await prisma.rentDocument.create({
    data: { employeeId, amount, rentStart, rentEnd, propertyAddress, landlordName, landlordPhone, landlordEmail, rentReceiptUrl, tenancyAgreementUrl },
  })

  const targetEmp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } })
  await logAudit({
    req, actor: user, action: "RENT_DOC_CREATE", entity: "RentDocument", entityId: doc.id,
    targetUserId: targetEmp?.userId ?? null,
    newValues: { employeeId, amount, propertyAddress, rentStart, rentEnd },
  })

  return NextResponse.json({ doc }, { status: 201 })
}
