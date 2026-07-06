import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewDisciplinary")
  if (perm) return perm

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""

  const policies = await prisma.disciplinaryPolicy.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : {},
    include: {
      violationType: { select: { id: true, name: true } },
      _count: { select: { exemptions: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ policies })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManagePolicies")
  if (perm) return perm

  const { name, violationTypeId, systemAction, hasThreshold, violationCount, description, exemptedEmployeeIds } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const policy = await prisma.disciplinaryPolicy.create({
    data: {
      name: name.trim(),
      violationTypeId: violationTypeId || null,
      systemAction: systemAction || null,
      hasThreshold: !!hasThreshold,
      violationCount: hasThreshold && violationCount ? Number(violationCount) : null,
      description: description?.trim() || null,
      exemptions: exemptedEmployeeIds?.length
        ? { create: (exemptedEmployeeIds as string[]).map(employeeId => ({ employeeId })) }
        : undefined,
    },
    include: { violationType: true, _count: { select: { exemptions: true } } },
  })

  await logAudit({
    req, actor: user, action: "POLICY_CREATE", entity: "DisciplinaryPolicy", entityId: policy.id,
    newValues: { name: policy.name, violationTypeId, systemAction, hasThreshold, violationCount },
  })

  return NextResponse.json({ policy }, { status: 201 })
}
