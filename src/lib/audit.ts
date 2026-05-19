import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { SessionUser } from "@/lib/api-auth"

export interface AuditOptions {
  req: NextRequest
  actor: SessionUser
  action: string
  entity: string
  entityId?: string | null
  targetUserId?: string | null
  oldValues?: unknown
  newValues?: unknown
  reason?: string | null
}

export async function logAudit(opts: AuditOptions): Promise<void> {
  try {
    const ipAddress =
      opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      opts.req.headers.get("x-real-ip") ??
      null
    const userAgent = opts.req.headers.get("user-agent") ?? null
    await prisma.auditLog.create({
      data: {
        userId: opts.actor.id,
        targetUserId: opts.targetUserId ?? null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ?? null,
        oldValues: (opts.oldValues as any) ?? undefined,
        newValues: (opts.newValues as any) ?? undefined,
        reason: opts.reason ?? null,
        ipAddress,
        userAgent,
      },
    })
  } catch (err) {
    console.error("[audit] failed to write log:", err)
  }
}

export function diffFields<T extends Record<string, any>>(
  before: T,
  after: T,
  fields: (keyof T)[],
): { old: Partial<T>; new: Partial<T> } | null {
  const oldVals: Partial<T> = {}
  const newVals: Partial<T> = {}
  let changed = false
  for (const f of fields) {
    if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) {
      oldVals[f] = before[f]
      newVals[f] = after[f]
      changed = true
    }
  }
  return changed ? { old: oldVals, new: newVals } : null
}
