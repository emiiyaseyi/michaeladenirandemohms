import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix, getRoleHome } from "@/lib/rbac"
import PolicyGate from "@/components/PolicyGate"

export default async function ProjectLeadLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = (session.user as any).role ?? "STAFF"

  if (role === "SUPER_ADMIN") redirect("/admin")
  if (role === "STAFF") redirect("/staff")
  if (role !== "PROJECT_LEAD") redirect(getRoleHome(role))

  const nav = getNavForRoleWithPrefix("PROJECT_LEAD")
  const employeeId = (session.user as any).employeeId as string | undefined

  return (
    <DashboardShell user={session.user} nav={nav} homeUrl="/project-lead">
      <PolicyGate employeeId={employeeId} />
      {children}
    </DashboardShell>
  )
}
