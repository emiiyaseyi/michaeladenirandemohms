import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

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
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
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

  return NextResponse.json({ contractor })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  await prisma.contractor.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
