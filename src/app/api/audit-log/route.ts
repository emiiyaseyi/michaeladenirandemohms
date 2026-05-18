import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const permError = requirePermission(user, "canViewAuditLog")
  if (permError) return permError

  const { searchParams } = new URL(req.url)
  const entity    = searchParams.get("entity") ?? undefined
  const action    = searchParams.get("action") ?? undefined
  const userId    = searchParams.get("userId") ?? undefined
  const search    = searchParams.get("search") ?? undefined
  const take      = Math.min(Number(searchParams.get("take") ?? "100"), 500)
  const skip      = Number(searchParams.get("skip") ?? "0")

  const where: any = {}
  if (entity)  where.entity  = { contains: entity,  mode: "insensitive" }
  if (action)  where.action  = { contains: action,  mode: "insensitive" }
  if (userId)  where.userId  = userId
  if (search)  where.OR = [
    { entity:   { contains: search, mode: "insensitive" } },
    { action:   { contains: search, mode: "insensitive" } },
    { entityId: { contains: search, mode: "insensitive" } },
    { user: { name: { contains: search, mode: "insensitive" } } },
  ]

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ logs, total })
}
