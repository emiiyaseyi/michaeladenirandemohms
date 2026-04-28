import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix, getRoleHome, type SystemRole } from "@/lib/rbac"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role ?? "STAFF"
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect(getRoleHome(role))
  return (
    <DashboardShell user={session.user} nav={getNavForRoleWithPrefix(role as SystemRole)} homeUrl="/admin">
      {children}
    </DashboardShell>
  )
}
