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
  "settings/admins":           "Admins",
  "settings/hr-payroll":       "HR & Payroll",
  "settings/departments":      "Departments",
  "settings/leave-types":      "Leave Types",
  "settings/public-holidays":  "Public Holidays",
  "settings/approval-workflows": "Approval Workflows",
  "settings/customization":    "Customization",
  "settings/single-sign-on":   "Single Sign-On",
  "settings/roles-permissions":"Roles & Permissions",
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
  "disciplinary/policies":         "Policies",
  "disciplinary/policies/new":     "Record New Policy",
  "disciplinary/violation-types": "Violation Types",
  "disciplinary/triggers":        "Triggers",
  "disciplinary/violations":      "Violations",
  "disciplinary/violations/new":  "Record Violation",
  "rent-documents":               "Rent Documents",
  "rent-documents/new":           "Add Rent Document",
  "performance/conversations/setup/new":    "Schedule Conversation",
  "performance/conversations/prompts/new":  "Add Prompt",
  "disciplinary/suspensions":              "Suspensions",
  "disciplinary/suspensions/new":          "Record Suspension",
  "disciplinary/suspensions/bulk-upload":  "Bulk Upload Suspensions",
  "time-tracking/absence":                 "Absence Batches",
  "surveys":                   "Surveys",
  "surveys/new":               "Create Survey",
  "surveys/templates/new":     "Survey Template",
  "contractors":               "Contractors",
  "contractors/new":           "Add Contractor",
  "contractors/bulk-update":   "Bulk Update Contractors",
  "contractors/bulk-upload":   "Bulk Upload Contractors",
  "self-service/edit":         "Edit Profile",
  "self-service/preferences":  "Preferences",
  "assets/overview":           "Assets",
  "assets/overview/new":       "Create New Asset",
  "assets/assignments":        "Assignments",
  "assets/assignments/new":    "Assign Asset",
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
    else if (segs[0] === "disciplinary" && segs[1] === "policies" && segs.length === 3) title = "View Policy"
    else if (segs[0] === "contractors" && segs.length === 1) title = "Contractors"
    else if (segs[0] === "contractors" && segs.length === 2) title = "Contractor Details"
    else if (segs[0] === "contractors" && segs[2] === "edit") title = "Edit Contractor"
    else if (segs[0] === "rent-documents" && segs[2] === "edit") title = "Edit Rent Document"
    else if (segs[0] === "assets" && segs[1] === "overview" && segs.length === 3) title = "View Asset"
    else if (segs[0] === "assets" && segs[1] === "overview" && segs[3] === "edit") title = "Edit Asset"
    else if (segs[0] === "assets" && segs[1] === "overview" && segs[3] === "employees") title = "Remove or Add Employees"
    else if (segs[0] === "assets" && segs[1] === "assignments" && segs.length === 3) title = "Employee Asset"
    else if (segs[0] === "time-tracking" && segs[1] === "absence" && segs.length === 3) title = "Absence"
    else if (segs[0] === "time-tracking" && segs[1] === "absence" && segs[3] === "new") title = "Record Employee Absence"
    else if (segs[0] === "time-tracking" && segs[1] === "absence" && segs[3] === "bulk-upload") title = "Bulk Upload Absent Days"
    else title = "DSN HRMS"
  }
  return <TopBar title={title} user={user} />
}
