import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const contractor = await prisma.contractor.findUnique({
    where: { id },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  })
  if (!contractor) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ contractor })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const before = await prisma.contractor.findUnique({ where: { id } })

  const contractor = await prisma.contractor.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email ?? undefined,
      phone: body.phone ?? undefined,
      country: body.country ?? undefined,
      state: body.state ?? undefined,
      address: body.address ?? undefined,
      businessType: body.businessType ?? undefined,
      companyRegNumber: body.companyRegNumber ?? undefined,
      industry: body.industry ?? undefined,
      currency: body.currency ?? undefined,
      paymentRoute: body.paymentRoute ?? undefined,
      bankName: body.bankName ?? undefined,
      accountNumber: body.accountNumber ?? undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      isActive: body.isActive ?? undefined,
    },
  })

  const CONTRACTOR_FIELDS = ["name", "email", "phone", "country", "state", "address", "businessType", "companyRegNumber", "industry", "currency", "paymentRoute", "bankName", "accountNumber", "startDate", "isActive"]
  const diff = before ? diffFields(before as any, contractor as any, CONTRACTOR_FIELDS as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "CONTRACTOR_EDIT", entity: "Contractor", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ contractor })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const before = await prisma.contractor.findUnique({ where: { id }, select: { name: true, email: true, businessType: true } })
  await prisma.contractor.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "CONTRACTOR_DELETE", entity: "Contractor", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
