import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix, getRoleHome } from "@/lib/rbac"

export default async function TeamLeadLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role ?? "STAFF"
  if (role !== "TEAM_LEAD") redirect(getRoleHome(role))
  return (
    <DashboardShell user={session.user} nav={getNavForRoleWithPrefix("TEAM_LEAD")} homeUrl="/team-lead">
      {children}
    </DashboardShell>
  )
}
