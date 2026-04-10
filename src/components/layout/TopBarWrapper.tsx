"use client"
import { usePathname } from "next/navigation"
import TopBar from "./TopBar"

const titles: Record<string, string> = {
  "/dashboard":      "Dashboard",
  "/self-service":   "Self Service",
  "/employees":      "Employees",
  "/leave":          "Leave Management",
  "/projects":       "Projects",
  "/recruitment":    "Recruitment & ATS",
  "/performance":    "Performance Management",
  "/onboarding":     "Onboarding",
  "/offboarding":    "Offboarding",
  "/documents":      "Document Management",
  "/announcements":  "Announcements",
  "/faq":            "FAQ",
  "/org-chart":      "Organisation Chart",
  "/analytics":      "Analytics & Reports",
  "/settings":       "Settings",
}

export default function TopBarWrapper({ user }: { user: any }) {
  const path = usePathname()
  const title = Object.entries(titles).find(([k]) => path === k || path.startsWith(k + "/"))?.[1] ?? "DSN HRMS"
  return <TopBar title={title} user={user} />
}
