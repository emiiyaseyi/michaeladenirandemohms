import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix } from "@/lib/rbac"
import PolicyGate from "@/components/PolicyGate"

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role ?? "STAFF"
  if (role === "SUPER_ADMIN") redirect("/admin")
  if (role === "PROJECT_LEAD") redirect("/project-lead")

  const nav = getNavForRoleWithPrefix("STAFF")
  const employeeId = (session.user as any).employeeId as string | undefined

  return (
    <DashboardShell user={session.user} nav={nav} homeUrl="/staff">
      <PolicyGate employeeId={employeeId} />
      {children}
    </DashboardShell>
  )
}
