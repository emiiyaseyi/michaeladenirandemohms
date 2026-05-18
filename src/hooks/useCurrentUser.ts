"use client"
import { useSession } from "next-auth/react"
import { getCapabilities, type SystemRole, type RoleCapabilities } from "@/lib/rbac"

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: SystemRole
  employeeId?: string
  caps: RoleCapabilities
  isElevated: boolean
  isAdmin: boolean
  permissions: Record<string, boolean>
  can: (key: string) => boolean
}

export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const { data: session, status } = useSession()

  if (status === "loading") return { user: null, loading: true }
  if (!session?.user) return { user: null, loading: false }

  const u = session.user as any
  const role = (u.role ?? "STAFF") as SystemRole
  const isElevated = !!(u.isElevated)
  const isAdmin = role === "SUPER_ADMIN" || isElevated
  const permissions = (u.permissions ?? {}) as Record<string, boolean>
  const can = (key: string) => role === "SUPER_ADMIN" || !!permissions[key]

  return {
    user: {
      id: u.id ?? "",
      name: u.name ?? "",
      email: u.email ?? "",
      role,
      employeeId: u.employeeId,
      caps: getCapabilities(role),
      isElevated,
      isAdmin,
      permissions,
      can,
    },
    loading: false,
  }
}
