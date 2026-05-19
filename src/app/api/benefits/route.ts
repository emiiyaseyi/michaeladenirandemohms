import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const search = req.nextUrl.searchParams.get("search") ?? ""

  const benefits = await prisma.benefit.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ benefits })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewBenefits")
  if (perm) return perm

  const body = await req.json()
  const { name, effectiveDate, category, enrollType } = body

  if (!name?.trim()) return NextResponse.json({ error: "Benefit name is required" }, { status: 400 })
  if (!effectiveDate) return NextResponse.json({ error: "Effective date is required" }, { status: 400 })

  const benefit = await prisma.benefit.create({
    data: {
      name: name.trim(),
      effectiveDate: new Date(effectiveDate),
      category: category || "Other (taxable)",
      enrollType: enrollType || "EMPLOYEES",
    },
  })

  await logAudit({
    req, actor: user, action: "BENEFIT_CREATE", entity: "Benefit", entityId: benefit.id,
    newValues: { name, category, enrollType, effectiveDate },
  })

  return NextResponse.json({ benefit }, { status: 201 })
}
