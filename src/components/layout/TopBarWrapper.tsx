"use client"
import { usePathname } from "next/navigation"
import TopBar from "./TopBar"

const titles: Record<string, string> = {
  "/dashboard":   "Dashboard",
  "/employees":   "Employees",
  "/leave":       "Leave Management",
  "/recruitment": "Recruitment & ATS",
  "/performance": "Performance Management",
  "/onboarding":  "Onboarding",
  "/offboarding": "Offboarding",
  "/org-chart":   "Organisation Chart",
  "/analytics":   "Analytics & Reports",
  "/settings":    "Settings",
}

export default function TopBarWrapper({ user }: { user: any }) {
  const path = usePathname()
  const title = Object.entries(titles).find(([k]) => path === k || path.startsWith(k + "/"))?.[1] ?? "DSN HRMS"
  return <TopBar title={title} user={user} />
}
