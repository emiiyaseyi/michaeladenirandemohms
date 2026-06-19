import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, hasCap, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAssets")) return forbidden()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { identifier: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }
  if (status === "active") where.isActive = true
  if (status === "inactive") where.isActive = false

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assetType: { select: { id: true, name: true } },
      _count: { select: { assignments: { where: { status: "ASSIGNED" } } } },
    },
  })

  return NextResponse.json({ assets })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canCreateAsset")) return forbidden()

  const body = await req.json()
  const { name, assetTypeId, description, identifier, commissionDate, isMultiAssignable, maxAssignees, assignments } = body

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  if (!commissionDate) return NextResponse.json({ error: "Commission date is required" }, { status: 400 })

  const asset = await prisma.asset.create({
    data: {
      name: name.trim(),
      assetTypeId: assetTypeId || null,
      description: description?.trim() || null,
      identifier: identifier?.trim() || null,
      commissionDate: new Date(commissionDate),
      isMultiAssignable: !!isMultiAssignable,
      maxAssignees: isMultiAssignable && maxAssignees ? parseInt(maxAssignees) : null,
    },
  })

  if (assignments && Array.isArray(assignments) && assignments.length > 0) {
    await prisma.assetAssignment.createMany({
      data: assignments.map((a: any) => ({
        assetId: asset.id,
        employeeId: a.employeeId,
        assignedOn: a.assignedOn ? new Date(a.assignedOn) : null,
        period: a.period ? parseInt(a.period) : null,
        periodUnit: a.periodUnit || null,
        description: a.description?.trim() || null,
        status: "ASSIGNED",
      })),
    })
  }

  await logAudit({
    req, actor: user, action: "ASSET_CREATE", entity: "Asset", entityId: asset.id,
    newValues: { name, identifier, assetTypeId, isMultiAssignable, initialAssignments: assignments?.length ?? 0 },
  })

  return NextResponse.json({ asset }, { status: 201 })
}
