import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ""
  const s = typeof v === "string" ? v : JSON.stringify(v)
  return `"${s.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const permError = requirePermission(user, "canViewAuditLog")
  if (permError) return permError

  const { searchParams } = new URL(req.url)
  const entity       = searchParams.get("entity") ?? undefined
  const action       = searchParams.get("action") ?? undefined
  const userId       = searchParams.get("userId") ?? undefined
  const targetUserId = searchParams.get("targetUserId") ?? undefined
  const search       = searchParams.get("search") ?? undefined
  const from         = searchParams.get("from") ?? undefined
  const to           = searchParams.get("to") ?? undefined
  const exportFormat = searchParams.get("format") // "csv" or null
  const take         = Math.min(Number(searchParams.get("take") ?? "100"), 500)
  const skip         = Number(searchParams.get("skip") ?? "0")

  const where: any = {}
  if (entity)       where.entity       = { contains: entity,  mode: "insensitive" }
  if (action)       where.action       = { contains: action,  mode: "insensitive" }
  if (userId)       where.userId       = userId
  if (targetUserId) where.targetUserId = targetUserId
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to)   { const d = new Date(to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d }
  }
  if (search)  where.OR = [
    { entity:     { contains: search, mode: "insensitive" } },
    { action:     { contains: search, mode: "insensitive" } },
    { entityId:   { contains: search, mode: "insensitive" } },
    { reason:     { contains: search, mode: "insensitive" } },
    { user:       { name: { contains: search, mode: "insensitive" } } },
    { targetUser: { name: { contains: search, mode: "insensitive" } } },
  ]

  // CSV export - no pagination, return everything matching the filters (capped at 50k for safety)
  if (exportFormat === "csv") {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50000,
      include: {
        user:       { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true } },
      },
    })
    const headers = [
      "Timestamp", "Action", "Entity", "Entity ID",
      "Actor Name", "Actor Email",
      "Target Name", "Target Email",
      "Reason", "IP Address", "User Agent",
      "Old Values", "New Values",
    ]
    const lines = [headers.map(csvCell).join(",")]
    for (const log of logs) {
      lines.push([
        log.createdAt.toISOString(),
        log.action,
        log.entity,
        log.entityId ?? "",
        log.user?.name ?? "",
        log.user?.email ?? "",
        log.targetUser?.name ?? "",
        log.targetUser?.email ?? "",
        log.reason ?? "",
        log.ipAddress ?? "",
        log.userAgent ?? "",
        log.oldValues ?? "",
        log.newValues ?? "",
      ].map(csvCell).join(","))
    }
    const csv = lines.join("\n")
    const today = new Date().toISOString().slice(0, 10)
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${today}.csv"`,
      },
    })
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        user:       { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ logs, total })
}
