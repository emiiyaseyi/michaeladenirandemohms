"use client"
import { usePathname } from "next/navigation"
import TopBar from "./TopBar"

const SECTION_TITLES: Record<string, string> = {
  "":                                   "Dashboard",
  "recruitment":                        "Recruitment & ATS",
  "recruitment/jobs":                   "Jobs",
  "recruitment/applicants":             "Applicants",
  "recruitment/settings":               "Recruitment Settings",
  "performance":                        "Performance Management",
  "performance/appraisals":             "Appraisals",
  "performance/cycles":                 "Performance Cycles",
  "performance/reviewers":              "Reviewers",
  "performance/my":                     "My Performance",
  "performance/peer-reviews":           "Peer Reviews",
  "performance/team-lead-review":       "Team Lead Review",
  "performance/to-review":              "To Review",
  "projects":                           "Projects",
  "documents":                          "Documents",
  "documents/new":                      "Create New Document",
  "documents/create-employee":          "Create Employee Document",
  "documents/offer-template/new":       "Offer Template",
  "announcements":                      "Announcements",
  "faq":                                "FAQ",
  "analytics":                          "Analytics & Reports",
  "reports":                            "Reports",
  "reports/intern-reports":             "Intern Reports",
  "audit-log":                          "Audit Log",
  "benefits":                           "Benefits",
  "calendar":                           "Calendar",
  "trash":                              "Trash",
  "preferences":                        "Preferences",
  "company-details":                    "Company Details",
  "company-details/workplaces":         "Workplaces",
  "company-details/workplaces/add":     "Add Workplace",
  "people":                             "People",
  "people/employees":                   "Employees",
  "people/employees/add":               "Add Employee",
  "people/employees/bulk-upload":       "Bulk Upload Employees",
  "people/employees/bulk-update":       "Bulk Update Employees",
  "people/confirmation":                "Confirmation",
  "people/custom-groups":               "Custom Groups",
  "people/custom-groups/new":           "New Custom Group",
  "people/departments":                 "Departments",
  "people/external-admins":             "External Admins",
  "people/job-titles":                  "Job Titles",
  "people/managers":                    "Managers",
  "people/offers":                      "Offers",
  "people/offers/new":                  "New Offer",
  "people/org-chart":                   "Organisation Chart",
  "people/personal-docs":               "Personal Documents",
  "people/documents":                   "Team Documents",
  "requests":                           "Requests",
  "requests/bus":                       "Bus Requests",
  "requests/documents":                 "Document Requests",
  "requests/leave":                     "Leave Requests",
  "requests/leave/record":              "Record Leave",
  "requests/leave/apply":               "Apply for Leave",
  "settings":                           "Settings",
  "settings/admins":                    "Admins",
  "settings/admins/new":                "Add Admin",
  "settings/admins/bulk-upload":        "Bulk Upload Admins",
  "settings/departments":               "Departments",
  "settings/leave-types":               "Leave Types",
  "settings/public-holidays":           "Public Holidays",
  "settings/customization":             "Customization",
  "settings/intern-reports":            "Intern Report Settings",
  "settings/roles-permissions":         "Roles & Permissions",
  "self-service":                       "Self Service",
  "self-service/profile":               "My Profile",
  "self-service/edit":                  "Edit Profile",
  "self-service/change-password":       "Change Password",
  "disciplinary":                       "Disciplinary",
  "disciplinary/policies":              "Policies",
  "disciplinary/policies/new":          "Record New Policy",
  "disciplinary/violation-types":       "Violation Types",
  "disciplinary/triggers":              "Triggers",
  "disciplinary/violations":            "Violations",
  "disciplinary/violations/new":        "Record Violation",
  "disciplinary/suspensions":           "Suspensions",
  "disciplinary/suspensions/new":       "Record Suspension",
  "disciplinary/suspensions/bulk-upload": "Bulk Upload Suspensions",
  "disciplinary/record":                "Disciplinary Record",
  "rent-documents":                     "Rent Documents",
  "rent-documents/new":                 "Add Rent Document",
  "time-tracking/absence":              "Absence Batches",
  "surveys":                            "Surveys",
  "surveys/new":                        "Create Survey",
  "surveys/templates/new":              "Survey Template",
  "assets/overview":                    "Assets",
  "assets/overview/new":                "Create New Asset",
  "assets/assignments":                 "Assignments",
  "assets/assignments/new":             "Assign Asset",
  "team":                               "Team",
  "intern-report":                      "Weekly Report",
  "intern-reports":                     "Intern Reports",
  "intern-reviews":                     "Intern Reviews",
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
    const segs = section.split("/")
    if (segs[0] === "people" && segs[1] === "employees" && segs.length === 3) title = "Employee Profile"
    else if (segs[0] === "people" && segs[1] === "custom-groups" && segs.length === 3) title = "Custom Group"
    else if (segs[0] === "people" && segs[1] === "custom-groups" && segs[3] === "edit") title = "Edit Custom Group"
    else if (segs[0] === "people" && segs[1] === "offers" && segs[3] === "edit") title = "Edit Offer"
    else if (segs[0] === "documents" && segs.length === 2) title = "View Document"
    else if (segs[0] === "documents" && segs[1] === "offer-template" && segs[3] === "edit") title = "Edit Offer Template"
    else if (segs[0] === "performance" && segs[1] === "appraisals" && segs.length === 3) title = "Appraisal"
    else if (segs[0] === "performance" && segs[1] === "cycles" && segs.length === 3) title = "Performance Cycle"
    else if (segs[0] === "performance" && segs[1] === "peer-reviews" && segs.length === 3) title = "Peer Review"
    else if (segs[0] === "performance" && segs[1] === "team-lead-review" && segs.length === 3) title = "Team Lead Review"
    else if (segs[0] === "performance" && segs[1] === "to-review" && segs.length === 3) title = "To Review"
    else if (segs[0] === "projects" && segs.length === 2) title = "Project"
    else if (segs[0] === "surveys" && segs.length === 2) title = "Survey"
    else if (segs[0] === "surveys" && segs[2] === "edit") title = "Edit Survey"
    else if (segs[0] === "surveys" && segs[1] === "templates" && segs[3] === "edit") title = "Edit Survey Template"
    else if (segs[0] === "benefits" && segs.length === 2) title = "Benefit"
    else if (segs[0] === "benefits" && segs[2] === "edit") title = "Edit Benefit"
    else if (segs[0] === "benefits" && segs[2] === "enroll") title = "Enroll in Benefit"
    else if (segs[0] === "disciplinary" && segs[1] === "policies" && segs.length === 3) title = "View Policy"
    else if (segs[0] === "rent-documents" && segs[2] === "edit") title = "Edit Rent Document"
    else if (segs[0] === "assets" && segs[1] === "overview" && segs.length === 3) title = "View Asset"
    else if (segs[0] === "assets" && segs[1] === "overview" && segs[3] === "edit") title = "Edit Asset"
    else if (segs[0] === "assets" && segs[1] === "overview" && segs[3] === "employees") title = "Asset Employees"
    else if (segs[0] === "assets" && segs[1] === "assignments" && segs.length === 3) title = "Employee Assets"
    else if (segs[0] === "time-tracking" && segs[1] === "absence" && segs.length === 3) title = "Absence Batch"
    else if (segs[0] === "time-tracking" && segs[1] === "absence" && segs[3] === "new") title = "Record Absence"
    else if (segs[0] === "time-tracking" && segs[1] === "absence" && segs[3] === "bulk-upload") title = "Bulk Upload Absences"
    else if (segs[0] === "company-details" && segs[1] === "workplaces" && segs[3] === "edit") title = "Edit Workplace"
    else if (segs[0] === "settings" && segs[1] === "roles-permissions" && segs.length === 3) title = "Role Details"
    else title = "DSN HRMS"
  }

  return <TopBar title={title} user={user} />
}
