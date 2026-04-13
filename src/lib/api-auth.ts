// Shared helper for API route authentication + role checks
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCapabilities, type SystemRole } from "@/lib/rbac"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export interface SessionUser {
  id: string
  email: string
  name: string
  role: SystemRole
  employeeId?: string
}

const COOKIE = "dsn_active_role"

export async function requireAuth(): Promise<
  { user: SessionUser; error: null } | { user: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  const u = session.user as any
  const primaryRole: SystemRole = u.role as SystemRole
  const additionalRoles: SystemRole[] = u.additionalRoles ?? []
  const allRoles = Array.from(new Set([primaryRole, ...additionalRoles]))

  // Check for active role override cookie
  let effectiveRole = primaryRole
  try {
    const jar = await cookies()
    const override = jar.get(COOKIE)?.value as SystemRole | undefined
    if (override && allRoles.includes(override)) {
      effectiveRole = override
    }
  } catch {}

  return {
    user: {
      id: u.id,
      email: u.email ?? "",
      name: u.name ?? "",
      role: effectiveRole,
      employeeId: u.employeeId,
    },
    error: null,
  }
}

export function caps(role: SystemRole) {
  return getCapabilities(role)
}

export function forbidden(msg = "Forbidden") {
  return NextResponse.json({ error: msg }, { status: 403 })
}
