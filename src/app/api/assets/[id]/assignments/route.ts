import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { assignments, useSameSettings } = body

  if (!Array.isArray(assignments)) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { _count: { select: { assignments: { where: { status: "ASSIGNED" } } } } },
  })
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

  const newEmployeeIds = assignments.map((a: any) => a.employeeId)
  const existing = await prisma.assetAssignment.findMany({
    where: { assetId: id, employeeId: { in: newEmployeeIds } },
  })
  const existingIds = new Set(existing.map(e => e.employeeId))

  const newCount = newEmployeeIds.filter((empId: string) => !existingIds.has(empId)).length
  const currentActive = asset._count.assignments
  if (asset.maxAssignees && currentActive + newCount > asset.maxAssignees) {
    return NextResponse.json({ error: `Exceeds maximum assignees (${asset.maxAssignees})` }, { status: 400 })
  }

  for (const a of assignments) {
    const data = {
      assignedOn: a.assignedOn ? new Date(a.assignedOn) : null,
      period: a.hasPeriod && a.period ? parseInt(a.period) : null,
      periodUnit: a.hasPeriod ? a.periodUnit || null : null,
      description: a.description?.trim() || null,
    }
    if (existingIds.has(a.employeeId) && useSameSettings) {
      await prisma.assetAssignment.updateMany({
        where: { assetId: id, employeeId: a.employeeId },
        data,
      })
    } else if (!existingIds.has(a.employeeId)) {
      await prisma.assetAssignment.create({
        data: { assetId: id, employeeId: a.employeeId, status: "ASSIGNED", ...data },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
