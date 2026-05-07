"use client"
import { usePathname } from "next/navigation"
import TopBar from "./TopBar"

const SECTION_TITLES: Record<string, string> = {
  "":                          "Dashboard",
  "employees":                 "Employees",
  "employees/teams":           "Teams",
  "employees/profile-requests":"Profile Update Requests",
  "leave":                     "Leave Management",
  "recruitment":               "Recruitment & ATS",
  "performance":               "Performance Management",
  "onboarding":                "Onboarding",
  "offboarding":               "Offboarding",
  "projects":                  "Projects",
  "departments":               "Departments",
  "documents":                 "Document Management",
  "announcements":             "Announcements",
  "faq":                       "FAQ",
  "org-chart":                 "Organisation Chart",
  "analytics":                 "Analytics & Reports",
  "reports":                   "Reports",
  "payslips":                  "Payslips",
  "trash":                     "Trash",
  "settings":                  "Settings",
  "payroll":                   "Payroll",
  "self-service":              "Self Service",
  "self-service/profile":      "My Profile",
  "self-service/leave":        "My Leave",
  "self-service/payslips":     "My Payslips",
  "self-service/requisitions": "My Requisitions",
  "self-service/grievance":    "Grievance",
  "self-service/exit":         "Exit Request",
  "self-service/surveys":      "Surveys",
  "self-service/edit":         "Edit Profile",
  "self-service/preferences":  "Preferences",
}

const ROLE_SLUGS = ["admin", "project-lead", "staff"]

export default function TopBarWrapper({ user }: { user: any }) {
  const path = usePathname()
  const parts = path.split("/").filter(Boolean)

  let section = ""
  if (ROLE_SLUGS.includes(parts[0])) {
    section = parts.slice(1).join("/")
  } else {
    section = parts.join("/")
  }

  const title = SECTION_TITLES[section] ?? "DSN HRMS"
  return <TopBar title={title} user={user} />
}
