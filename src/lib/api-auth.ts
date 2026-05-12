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
  isElevated: boolean
  permissions: Record<string, boolean>
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
      isElevated: !!(u.isElevated),
      permissions: (u.permissions ?? {}) as Record<string, boolean>,
    },
    error: null,
  }
}

// Returns a 403 response if the user lacks the permission; null if allowed.
// SUPER_ADMIN always passes.
export function requirePermission(user: SessionUser, key: string): NextResponse | null {
  if (user.role === "SUPER_ADMIN") return null
  if (user.permissions[key]) return null
  return forbidden(`Missing permission: ${key}`)
}

export function caps(role: SystemRole) {
  return getCapabilities(role)
}

export function forbidden(msg = "Forbidden") {
  return NextResponse.json({ error: msg }, { status: 403 })
}

export function isAdminRole(role: string): boolean {
  return role === "SUPER_ADMIN"
}

export function isHRAdmin(role: string): boolean {
  return role === "SUPER_ADMIN"
}

export function roleBasePath(role: string): string {
  if (role === "SUPER_ADMIN") return "/admin"
  if (role === "PROJECT_LEAD") return "/project-lead"
  return "/staff"
}
