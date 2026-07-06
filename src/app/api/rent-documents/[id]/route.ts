import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { UPLOADS_ENABLED, uploadsDisabledResponse } from "@/lib/uploads"

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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewRentDocuments")
  if (perm) return perm

  const { id } = await params
  const doc = await prisma.rentDocument.findUnique({
    where: { id },
    include: { employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
  })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ doc })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const ct = req.headers.get("content-type") ?? ""

  if (ct.includes("multipart/form-data")) {
    if (!UPLOADS_ENABLED) return uploadsDisabledResponse()
    const form = await req.formData()
    const data: any = {}
    for (const k of ["employeeId", "propertyAddress", "landlordName", "landlordPhone", "landlordEmail"]) {
      const v = form.get(k) as string | null
      if (v !== null) data[k] = v || null
    }
    const amount = form.get("amount")
    if (amount) data.amount = parseFloat(amount as string)
    const rentStart = form.get("rentStart")
    if (rentStart) data.rentStart = new Date(rentStart as string)
    const rentEnd = form.get("rentEnd")
    if (rentEnd) data.rentEnd = new Date(rentEnd as string)

    const receipt = form.get("rentReceipt") as File | null
    if (receipt && receipt.size > 0) {
      if (!ALLOWED.includes(receipt.type)) return NextResponse.json({ error: "Invalid receipt type" }, { status: 400 })
      if (receipt.size > MAX_BYTES) return NextResponse.json({ error: "Receipt exceeds 1MB" }, { status: 400 })
      data.rentReceiptUrl = await saveFile(receipt, "rent-documents")
    }
    const tenancy = form.get("tenancyAgreement") as File | null
    if (tenancy && tenancy.size > 0) {
      if (!ALLOWED.includes(tenancy.type)) return NextResponse.json({ error: "Invalid tenancy type" }, { status: 400 })
      if (tenancy.size > MAX_BYTES) return NextResponse.json({ error: "Tenancy agreement exceeds 1MB" }, { status: 400 })
      data.tenancyAgreementUrl = await saveFile(tenancy, "rent-documents")
    }
    const doc = await prisma.rentDocument.update({ where: { id }, data })
    await logAudit({ req, actor: user, action: "RENT_DOC_EDIT", entity: "RentDocument", entityId: id, newValues: data })
    return NextResponse.json({ doc })
  }

  const body = await req.json()
  const doc = await prisma.rentDocument.update({ where: { id }, data: body })
  await logAudit({ req, actor: user, action: "RENT_DOC_EDIT", entity: "RentDocument", entityId: id, newValues: body })
  return NextResponse.json({ doc })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const before = await prisma.rentDocument.findUnique({ where: { id }, select: { employeeId: true, amount: true, propertyAddress: true } })
  await prisma.rentDocument.delete({ where: { id } })
  await logAudit({
    req, actor: user, action: "RENT_DOC_DELETE", entity: "RentDocument", entityId: id,
    oldValues: before ?? undefined,
  })
  return NextResponse.json({ ok: true })
}
