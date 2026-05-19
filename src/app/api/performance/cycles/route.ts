import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManagePerformancePeriods")
  if (perm && !user.permissions["canViewPerformance"] && user.role !== "PROJECT_LEAD" && user.role !== "STAFF") return forbidden()

  const cycles = await prisma.performanceCycle.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ cycles })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManagePerformancePeriods")
  if (perm) return perm

  const { name, year, half, startDate, endDate, kpiDeadline } = await req.json()
  const cycle = await prisma.performanceCycle.create({
    data: {
      name, year: Number(year), half: Number(half ?? 1),
      startDate: new Date(startDate), endDate: new Date(endDate),
      kpiDeadline: kpiDeadline ? new Date(kpiDeadline) : null,
    }
  })

  await logAudit({ req, actor: user, action: "PERFORMANCE_CYCLE_CREATE", entity: "PerformanceCycle", entityId: cycle.id, newValues: { name, year, half } })

  return NextResponse.json({ cycle }, { status: 201 })
}
