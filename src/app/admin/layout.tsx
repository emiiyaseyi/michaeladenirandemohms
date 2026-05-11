import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix, getRoleHome, type SystemRole } from "@/lib/rbac"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = (session.user as any).role ?? "STAFF"
  const userId = (session.user as any).id as string | undefined

  const isSuperAdmin = role === "SUPER_ADMIN"
  const isAdminRole  = role === "ADMIN"

  // Allow STAFF users elevated via UserAdminRole
  let isElevated = false
  if (!isSuperAdmin && !isAdminRole && userId) {
    isElevated = (await prisma.userAdminRole.count({ where: { userId } })) > 0
  }

  if (!isSuperAdmin && !isAdminRole && !isElevated) redirect(getRoleHome(role))

  // SUPER_ADMIN gets full nav; ADMIN and elevated STAFF get ADMIN nav
  const navRole: SystemRole = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"

  return (
    <DashboardShell user={session.user} nav={getNavForRoleWithPrefix(navRole)} homeUrl="/admin">
      {children}
    </DashboardShell>
  )
}
