import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix, getRoleHome } from "@/lib/rbac"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role ?? "STAFF"
  if (role !== "ADMIN") redirect(getRoleHome(role))
  return (
    <DashboardShell user={session.user} nav={getNavForRoleWithPrefix("ADMIN")} homeUrl="/admin">
      {children}
    </DashboardShell>
  )
}
