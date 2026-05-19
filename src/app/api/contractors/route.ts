import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewContractors")
  if (perm) return perm

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  const where: any = {}
  if (status === "active") where.isActive = true
  else if (status === "inactive") where.isActive = false
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }

  const contractors = await prisma.contractor.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ contractors })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const contractor = await prisma.contractor.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      country: body.country || null,
      state: body.state || null,
      address: body.address || null,
      businessType: body.businessType || null,
      companyRegNumber: body.companyRegNumber || null,
      industry: body.industry || null,
      currency: body.currency || "NGN",
      paymentRoute: body.paymentRoute || "LOCAL_BANK",
      bankName: body.bankName || null,
      accountNumber: body.accountNumber || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
    },
  })

  await logAudit({
    req, actor: user, action: "CONTRACTOR_CREATE", entity: "Contractor", entityId: contractor.id,
    newValues: { name: contractor.name, email: contractor.email, businessType: contractor.businessType, currency: contractor.currency },
  })

  return NextResponse.json({ contractor }, { status: 201 })
}
