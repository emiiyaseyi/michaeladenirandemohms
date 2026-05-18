import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewAssets")
  if (perm) return perm

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""

  const where: any = {}
  if (status === "assigned") where.status = "ASSIGNED"
  if (status === "released") where.status = "RELEASED"
  if (search) {
    where.OR = [
      { employee: { firstName: { contains: search, mode: "insensitive" } } },
      { employee: { lastName: { contains: search, mode: "insensitive" } } },
      { asset: { name: { contains: search, mode: "insensitive" } } },
      { asset: { identifier: { contains: search, mode: "insensitive" } } },
    ]
  }

  const assignments = await prisma.assetAssignment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, profilePhoto: true },
      },
      asset: {
        select: { id: true, name: true, identifier: true, assetType: { select: { name: true } } },
      },
    },
  })

  return NextResponse.json({ assignments })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageAssetAssignments")
  if (perm) return perm

  const body = await req.json()
  const { employeeId, assetId, assignedOn, hasTenure, period, interval, note } = body

  if (!employeeId) return NextResponse.json({ error: "Employee is required" }, { status: 400 })
  if (!assetId) return NextResponse.json({ error: "Asset is required" }, { status: 400 })

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { _count: { select: { assignments: { where: { status: "ASSIGNED" } } } } },
  })
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

  if (asset.maxAssignees && asset._count.assignments >= asset.maxAssignees) {
    return NextResponse.json({ error: `Asset is at maximum capacity (${asset.maxAssignees})` }, { status: 400 })
  }

  const existing = await prisma.assetAssignment.findFirst({
    where: { assetId, employeeId, status: "ASSIGNED" },
  })
  if (existing) return NextResponse.json({ error: "Employee already has this asset assigned" }, { status: 400 })

  const assignment = await prisma.assetAssignment.create({
    data: {
      assetId,
      employeeId,
      assignedOn: assignedOn ? new Date(assignedOn) : null,
      period: hasTenure && period ? parseInt(period) : null,
      periodUnit: hasTenure ? interval || null : null,
      description: note?.trim() || null,
      status: "ASSIGNED",
    },
  })

  return NextResponse.json({ assignment }, { status: 201 })
}
