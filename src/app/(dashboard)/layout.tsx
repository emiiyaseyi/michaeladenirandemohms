import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Sidebar from "@/components/layout/Sidebar"
import TopBarWrapper from "@/components/layout/TopBarWrapper"
import SidebarAwareLayout from "@/components/layout/SidebarAwareLayout"
import IdleTimeout from "@/components/IdleTimeout"
import { prisma } from "@/lib/prisma"
import { UserCheck, UserMinus } from "lucide-react"
import type { NavItem, SystemRole } from "@/lib/rbac"

const STAFF_ROLES = ["STAFF", "INTERN"]
const COOKIE = "dsn_active_role"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const u = session.user as any
  const primaryRole: SystemRole = u.role ?? "STAFF"
  const additionalRoles: SystemRole[] = u.additionalRoles ?? []
  const allRoles = Array.from(new Set([primaryRole, ...additionalRoles])) as SystemRole[]

  // Determine effective role from cookie override
  const jar = await cookies()
  const cookieRole = jar.get(COOKIE)?.value as SystemRole | undefined
  const effectiveRole: SystemRole = (cookieRole && allRoles.includes(cookieRole)) ? cookieRole : primaryRole

  // Build the enriched user object with effective role for nav/topbar
  const effectiveUser = { ...u, role: effectiveRole, primaryRole, additionalRoles }

  // For staff/intern, check whether they have been triggered for onboarding or offboarding
  const extraNav: NavItem[] = []
  if (STAFF_ROLES.includes(effectiveRole)) {
    const employee = await prisma.employee.findUnique({
      where: { userId: u.id },
      select: {
        onboardingTasks: { where: { status: { not: "COMPLETED" } }, take: 1 },
        offboarding: { select: { status: true } },
      },
    })

    if (employee?.onboardingTasks.length) {
      extraNav.push({ label: "Onboarding", href: "/onboarding", icon: UserCheck, roles: ["STAFF", "INTERN"] })
    }
    if (employee?.offboarding && employee.offboarding.status !== "COMPLETED" && employee.offboarding.status !== "CANCELLED") {
      extraNav.push({ label: "Offboarding", href: "/offboarding", icon: UserMinus, roles: ["STAFF", "INTERN"] })
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar user={effectiveUser} extraNav={extraNav} />
      <SidebarAwareLayout userRole={effectiveRole}>
        <TopBarWrapper user={effectiveUser} />
        <main style={{ flex: 1, padding: 24 }}>
          {children}
        </main>
      </SidebarAwareLayout>
      <IdleTimeout />
    </div>
  )
}
