import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewAbsences")
  if (perm) return perm

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const batches = await prisma.absenceBatch.findMany({
    where: search ? { description: { contains: search, mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ batches })
}

export async function POST(req: NextRequest) {
  const { user: u2, error: e2 } = await requireAuth()
  if (e2) return e2
  const p2 = requirePermission(u2, "canCreateAbsence")
  if (p2) return p2

  const { description, startDate, endDate } = await req.json()
  if (!description?.trim() || !startDate || !endDate)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  const batch = await prisma.absenceBatch.create({
    data: { description: description.trim(), startDate: new Date(startDate), endDate: new Date(endDate) },
  })

  await logAudit({
    req, actor: u2, action: "ABSENCE_BATCH_CREATE", entity: "AbsenceBatch", entityId: batch.id,
    newValues: { description, startDate, endDate },
  })

  return NextResponse.json({ batch }, { status: 201 })
}
