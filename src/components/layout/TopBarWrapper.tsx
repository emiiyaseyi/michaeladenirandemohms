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
  "projects":                  "Projects",
  "departments":               "Departments",
  "documents":                 "Documents",
  "documents/new":             "Create new document",
  "documents/create-employee": "Create Employee Document",
  "documents/offer-template/new": "Offer Template",
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
  "performance/groups":        "Performance Groups",
  "performance/conversations": "Conversations",
  "performance/feedback":      "Feedback",
  "performance/conversations/setup/new":    "Schedule Conversation",
  "performance/conversations/prompts/new":  "Add Prompt",
  "surveys":                   "Surveys",
  "surveys/new":               "Create Survey",
  "surveys/templates/new":     "Survey Template",
  "contractors":               "Contractors",
  "contractors/new":           "Add Contractor",
  "contractors/bulk-update":   "Bulk Update Contractors",
  "contractors/bulk-upload":   "Bulk Upload Contractors",
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

  let title = SECTION_TITLES[section]
  if (!title) {
    // Dynamic segment patterns
    const segs = section.split("/")
    if (segs[0] === "documents" && segs.length === 2) title = "View Employee Document"
    else if (segs[0] === "documents" && segs[1] === "offer-template" && segs[3] === "edit") title = "Offer Template"
    else if (segs[0] === "performance" && segs[1] === "groups" && segs[2] === "new") title = "Create Group"
    else if (segs[0] === "performance" && segs[1] === "groups" && segs.length === 3) title = "View Group"
    else if (segs[0] === "performance" && segs[1] === "groups" && segs[3] === "edit") title = "Edit Group"
    else if (segs[0] === "performance" && segs[1] === "conversations" && segs[2] === "setup" && segs[4] === "edit") title = "Edit Conversation Setup"
    else if (segs[0] === "performance" && segs[1] === "conversations" && segs[2] === "prompts" && segs[4] === "edit") title = "Edit Prompt"
    else if (segs[0] === "contractors" && segs.length === 1) title = "Contractors"
    else if (segs[0] === "contractors" && segs.length === 2) title = "Contractor Details"
    else if (segs[0] === "contractors" && segs[2] === "edit") title = "Edit Contractor"
    else title = "DSN HRMS"
  }
  return <TopBar title={title} user={user} />
}
