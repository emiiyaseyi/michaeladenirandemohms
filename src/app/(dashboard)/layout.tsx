import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/layout/Sidebar"
import TopBarWrapper from "@/components/layout/TopBarWrapper"
import { prisma } from "@/lib/prisma"
import { UserCheck, UserMinus } from "lucide-react"
import type { NavItem } from "@/lib/rbac"

const STAFF_ROLES = ["STAFF", "INTERN"]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // For staff/intern, check whether they have been triggered for onboarding or offboarding
  const extraNav: NavItem[] = []
  if (STAFF_ROLES.includes((session.user as any).role)) {
    const employee = await prisma.employee.findUnique({
      where: { userId: (session.user as any).id },
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

  // Staff and interns land on the self-service profile as their home page
  const role = (session.user as any).role ?? "STAFF"
  // We don't redirect here because this layout wraps /self-service too.
  // The redirect is handled in the dashboard page itself via a client-side component.

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar user={session.user} extraNav={extraNav} />
      <div style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <TopBarWrapper user={session.user} />
        <main style={{ flex: 1, padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
