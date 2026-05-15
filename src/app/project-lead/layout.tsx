import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix, getRoleHome } from "@/lib/rbac"

export default async function ProjectLeadLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = (session.user as any).role ?? "STAFF"
  const userId = (session.user as any).id as string | undefined

  // Only PROJECT_LEAD (and elevated PROJECT_LEAD) can access this panel
  // SUPER_ADMIN goes to admin, STAFF goes to staff
  if (role === "SUPER_ADMIN") redirect("/admin")
  if (role === "STAFF") redirect("/staff")
  if (role !== "PROJECT_LEAD") redirect(getRoleHome(role))

  const nav = getNavForRoleWithPrefix("PROJECT_LEAD")

  // Conditionally add onboarding/offboarding nav items
  if (userId) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: {
        onboardingTasks: { where: { status: { not: "COMPLETED" } }, take: 1 },
      },
    })
    if (employee?.onboardingTasks.length) {
      nav.push({ label: "Onboarding", href: "/project-lead/onboarding", icon: "UserCheck", roles: ["PROJECT_LEAD"] })
    }
  }

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
