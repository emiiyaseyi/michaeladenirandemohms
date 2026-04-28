// Shared helper for API route authentication + role checks
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCapabilities, type SystemRole } from "@/lib/rbac"
import { NextResponse } from "next/server"

export interface SessionUser {
  id: string
  email: string
  name: string
  role: SystemRole
  employeeId?: string
}

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

  return {
    user: {
      id: u.id,
      email: u.email ?? "",
      name: u.name ?? "",
      role: u.role as SystemRole,
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
