import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix } from "@/lib/rbac"

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role ?? "STAFF"
  if (role === "SUPER_ADMIN") redirect("/admin")
  if (role === "PROJECT_LEAD") redirect("/project-lead")

  const nav = getNavForRoleWithPrefix("STAFF")

  return (
    <DashboardShell user={session.user} nav={nav} homeUrl="/staff">
      {children}
    </DashboardShell>
  )
}
