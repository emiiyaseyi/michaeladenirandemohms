import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/layout/DashboardShell"
import { getNavForRoleWithPrefix, getRoleHome } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role ?? "STAFF"
  if (role !== "STAFF") redirect(getRoleHome(role))

  const nav = getNavForRoleWithPrefix("STAFF")

  // Conditionally add onboarding/offboarding nav items
  const userId = (session.user as any).id
  if (userId) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: {
        onboardingTasks: { where: { status: { not: "COMPLETED" } }, take: 1 },
        offboarding: { select: { status: true } },
      },
    })
    if (employee?.onboardingTasks.length) {
      nav.push({ label: "Onboarding", href: "/staff/onboarding", icon: "UserCheck", roles: ["STAFF"] })
    }
    if (employee?.offboarding && !["COMPLETED","CANCELLED"].includes(employee.offboarding.status)) {
      nav.push({ label: "Offboarding", href: "/staff/offboarding", icon: "UserMinus", roles: ["STAFF"] })
    }
  }

  return (
    <DashboardShell user={session.user} nav={nav} homeUrl="/staff">
      {children}
    </DashboardShell>
  )
}
