import Sidebar from "./Sidebar"
import TopBarWrapper from "./TopBarWrapper"
import SidebarAwareLayout from "./SidebarAwareLayout"
import IdleTimeout from "@/components/layout/IdleTimeout"
import ProfileCompletionReminder from "@/components/layout/ProfileCompletionReminder"
import { getRoleHome } from "@/lib/rbac"
import type { NavItem } from "@/lib/rbac"

interface Props {
  user: any
  nav: NavItem[]
  homeUrl?: string
  children: React.ReactNode
}

export default function DashboardShell({ user, nav, homeUrl = "/", children }: Props) {
  const rolePath = getRoleHome(user?.role)
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar user={user} nav={nav} homeUrl={homeUrl} />
      <SidebarAwareLayout userRole={user?.role} topBar={<TopBarWrapper user={user} />}>
        <main style={{ flex: 1, padding: 24, minWidth: 0, overflowX: "hidden" }}>
          {children}
        </main>
      </SidebarAwareLayout>
      <IdleTimeout />
      {user?.role !== "SUPER_ADMIN" && <ProfileCompletionReminder rolePath={rolePath} />}
    </div>
  )
}
