import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix, getRoleHome } from "@/lib/rbac"

export default async function ProjectLeadLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = (session.user as any).role ?? "STAFF"

  // Only PROJECT_LEAD (and elevated PROJECT_LEAD) can access this panel
  // SUPER_ADMIN goes to admin, STAFF goes to staff
  if (role === "SUPER_ADMIN") redirect("/admin")
  if (role === "STAFF") redirect("/staff")
  if (role !== "PROJECT_LEAD") redirect(getRoleHome(role))

  const nav = getNavForRoleWithPrefix("PROJECT_LEAD")

  return (
    <DashboardShell
      user={session.user}
      nav={nav}
      homeUrl="/project-lead"
    >
      {children}
    </DashboardShell>
  )
}
