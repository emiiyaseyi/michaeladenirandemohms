import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix, getRoleHome } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role ?? "STAFF"
  if (role === "SUPER_ADMIN") redirect("/admin")
  if (role === "PROJECT_LEAD") redirect("/project-lead")

  const nav = getNavForRoleWithPrefix("STAFF")

  // Conditionally add onboarding/offboarding nav items
  const userId = (session.user as any).id
  if (userId) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: {
        onboardingTasks: { where: { status: { not: "COMPLETED" } }, take: 1 },
      },
    })
    if (employee?.onboardingTasks.length) {
      nav.push({ label: "Onboarding", href: "/staff/onboarding", icon: "UserCheck", roles: ["STAFF"] })
    }
  }

  return (
    <DashboardShell user={session.user} nav={nav} homeUrl="/staff">
      {children}
    </DashboardShell>
  )
}
