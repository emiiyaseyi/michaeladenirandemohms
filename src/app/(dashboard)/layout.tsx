import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/layout/Sidebar"
import TopBar from "@/components/layout/TopBar"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/employees": "Employees",
  "/leave": "Leave Management",
  "/recruitment": "Recruitment & ATS",
  "/performance": "Performance Management",
  "/onboarding": "Onboarding",
  "/offboarding": "Offboarding",
  "/org-chart": "Organisation Chart",
  "/analytics": "Analytics & Reports",
  "/settings": "Settings",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar user={session.user} />
      <div style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <main style={{ flex: 1, padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
