// ─── RBAC — Role-Based Access Control ───────────────────────────────────────

export type SystemRole = "SUPER_ADMIN" | "PROJECT_LEAD" | "STAFF"

// Nav panel role — "ADMIN" is an internal nav concept (admin panel items),
// not a DB system role.
export type NavPanelRole = SystemRole | "ADMIN"

export interface ChildNavItem {
  label: string
  href: string
  excludeRoles?: SystemRole[]
  exact?: boolean
  permission?: string
}

export interface NavItem {
  label: string
  href?: string
  icon: string
  roles: NavPanelRole[]
  section?: string
  children?: ChildNavItem[]
  indent?: boolean
  skipForRoles?: SystemRole[]
  spacer?: boolean
  permission?: string
  requiresIntern?: true
  hideForIntern?: true
}

export const ALL_ROLES: NavPanelRole[] = ["SUPER_ADMIN", "ADMIN", "STAFF"]

export const NAV_ITEMS: NavItem[] = [

  // ── Top ─────────────────────────────────────────────────────────────────────
  { label: "Dashboard",       href: "/dashboard",       icon: "LayoutDashboard", roles: ALL_ROLES },
  { label: "Company Details", href: "/company-details", icon: "Building2",       roles: ["SUPER_ADMIN"] },

  // Spacers — visual gap after the top items, role-specific
  { label: "__spacer_top_admin__", spacer: true, icon: "", roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "__spacer_top_staff__", spacer: true, icon: "", roles: ["STAFF"] },

  // ── STAFF items after spacer ─────────────────────────────────────────────────
  { label: "People",        href: "/people",        icon: "Users",         roles: ["STAFF"] },
  { label: "Weekly Report",   href: "/intern-report",  icon: "ClipboardList",  roles: ["STAFF"], requiresIntern: true },
  { label: "Intern Reviews", href: "/intern-reviews", icon: "ClipboardCheck", roles: ["STAFF"], hideForIntern: true },
  { label: "My Projects",    href: "/projects",       icon: "FolderKanban",   roles: ["STAFF"], hideForIntern: true },

  // ── PEOPLE ──────────────────────────────────────────────────────────────────
  {
    label: "People", icon: "Users", roles: ["ADMIN"], section: "PEOPLE", permission: "canViewAllEmployees",
    children: [
      { label: "Employees",        href: "/people/employees" },
      { label: "Departments",      href: "/people/departments" },
      { label: "Managers",         href: "/people/managers" },
      { label: "Custom Groups",    href: "/people/custom-groups",   permission: "canViewCustomGroups" },
      { label: "Offers",           href: "/people/offers",          permission: "canViewOffers" },
      { label: "External Admins",  href: "/people/external-admins", permission: "canManageAdmins" },
      { label: "Confirmation",     href: "/people/confirmation" },
      { label: "Org. Chart",       href: "/people/org-chart",       permission: "canViewOrgChart" },
      { label: "Job Titles",       href: "/people/job-titles",      permission: "canViewJobTitles" },
      { label: "Profile Requests", href: "/people/profile-requests",permission: "canManageProfileRequests" },
    ],
  },
  {
    label: "Hiring", icon: "Briefcase", roles: ["ADMIN"], permission: "canViewJobs",
    children: [
      { label: "Overview",   href: "/recruitment", exact: true },
      { label: "Jobs",       href: "/recruitment/jobs" },
      { label: "Applicants", href: "/recruitment/applicants", permission: "canViewApplicants" },
      { label: "Settings",   href: "/recruitment/settings",   permission: "canManageHiringSettings" },
    ],
  },

  { label: "Leave Requests",       href: "/requests/leave",     icon: "CalendarDays", roles: ["ADMIN"], permission: "canViewAllLeave" },
  { label: "Documents Requests",   href: "/requests/documents", icon: "FileText",     roles: ["ADMIN"], permission: "canViewDocuments" },
  { label: "Bus Booking Requests", href: "/requests/bus",       icon: "Bus",          roles: ["ADMIN"] },

  { label: "Leave Requests",       href: "/requests/leave", icon: "CalendarDays", roles: ["STAFF"] },
  { label: "Bus Booking Requests", href: "/requests/bus",   icon: "Bus",          roles: ["STAFF"] },

  // Documents before Surveys (staff order)
  { label: "Documents",   href: "/documents",   icon: "FolderOpen",    roles: ALL_ROLES, permission: "canViewDocuments" },
  { label: "Surveys",     href: "/surveys",     icon: "ClipboardList", roles: ALL_ROLES, permission: "canViewSurveys" },
  // ── COMPENSATION ─────────────────────────────────────────────────────────────
  { label: "Benefits", href: "/benefits", icon: "Gift", roles: ["ADMIN"], permission: "canViewBenefits" },
  { label: "Benefits", href: "/benefits", icon: "Gift", roles: ["STAFF"], hideForIntern: true },

  // ── PRODUCTIVITY ─────────────────────────────────────────────────────────────
  {
    label: "Performance", icon: "TrendingUp", roles: ["ADMIN"], section: "PRODUCTIVITY", permission: "canViewPerformance",
    children: [
      { label: "Overview",         href: "/performance", exact: true },
      { label: "Cycles",           href: "/performance/cycles",    permission: "canManageAppraisalCycles" },
      { label: "Assign Reviewers", href: "/performance/reviewers", permission: "canAssignReviewers" },
      { label: "Appraisals",       href: "/performance/appraisals" },
      { label: "Leaderboards",     href: "/performance/leaderboards" },
    ],
  },
  {
    label: "Performance", icon: "TrendingUp", roles: ["STAFF"], section: "PRODUCTIVITY",
    children: [
      { label: "Overview",         href: "/performance", exact: true },
      { label: "My Appraisal",     href: "/performance/my" },
      { label: "Peer Reviews",     href: "/performance/peer-reviews" },
      { label: "Team Lead Review", href: "/performance/team-lead-review" },
      { label: "Leaderboards",     href: "/performance/leaderboards" },
    ],
  },
  { label: "Assets",    href: "/assets",    icon: "Package", roles: ["STAFF"] },
  {
    label: "Time Tracking", icon: "Clock", roles: ["ADMIN"], permission: "canViewAbsences",
    children: [
      { label: "Absence", href: "/time-tracking/absence" },
    ],
  },
  {
    label: "Disciplinary", icon: "Scale", roles: ["ADMIN"], permission: "canViewDisciplinary",
    children: [
      { label: "Suspensions",     href: "/disciplinary/suspensions" },
      { label: "Violations",      href: "/disciplinary/violations" },
      { label: "Policies",        href: "/disciplinary/policies" },
      { label: "Triggers",        href: "/disciplinary/triggers" },
      { label: "Violation Types", href: "/disciplinary/violation-types" },
    ],
  },
  { label: "Disciplinary", href: "/disciplinary", icon: "Scale", roles: ["STAFF"] },

  // ── OTHER ────────────────────────────────────────────────────────────────────
  {
    label: "Settings", icon: "Settings", roles: ["SUPER_ADMIN"], section: "OTHER",
    children: [
      { label: "Admins",              href: "/settings/admins" },
      { label: "Departments",         href: "/settings/departments" },
      { label: "Leave Types",         href: "/settings/leave-types" },
      { label: "Public Holidays",     href: "/settings/public-holidays" },
      { label: "Approval Workflows",  href: "/settings/approval-workflows" },
      { label: "Customization",       href: "/settings/customization" },
      { label: "Intern Reports",      href: "/settings/intern-reports" },
      { label: "Roles & Permissions", href: "/settings/roles-permissions" },
    ],
  },
  {
    label: "Reports", icon: "BarChart2", roles: ["ADMIN"], section: "OTHER", permission: "canViewReports",
    children: [
      { label: "General Reports", href: "/reports", exact: true },
      { label: "Interns", href: "/reports/intern-reports", permission: "canViewInternReports" },
    ],
  },
  {
    label: "Assets", icon: "Package", roles: ["ADMIN"], permission: "canViewAssets",
    children: [
      { label: "Overview",    href: "/assets/overview" },
      { label: "Assignments", href: "/assets/assignments" },
    ],
  },
  { label: "Rent Documents", href: "/rent-documents", icon: "House",    roles: ["ADMIN"], permission: "canViewRentDocuments" },
  { label: "Audit Log",      href: "/audit-log",      icon: "FileText", roles: ["ADMIN"], permission: "canViewAuditLog" },
  {
    label: "Announcements", icon: "Megaphone", roles: ["ADMIN"], permission: "canViewAnnouncements",
    href: "/announcements",
  },
  { label: "Analytics",     href: "/analytics",     icon: "BarChart3",     roles: ["ADMIN"], permission: "canViewAnalytics" },
  { label: "Trash",         href: "/trash",         icon: "Trash2",        roles: ["ADMIN"], permission: "canViewAuditLog" },

  // ── EXTRAS ───────────────────────────────────────────────────────────────────
  { label: "Preferences", href: "/preferences", icon: "UserCircle", roles: ["SUPER_ADMIN"],           section: "EXTRAS" },
  { label: "Calendar",    href: "/calendar",    icon: "Calendar",   roles: ["SUPER_ADMIN", "ADMIN"],  section: "EXTRAS" },
  { label: "FAQ",         href: "/faq",         icon: "HelpCircle", roles: ["SUPER_ADMIN", "ADMIN"] },

  // ── STAFF bottom group ───────────────────────────────────────────────────────
  { label: "__spacer_bottom_staff__", spacer: true, icon: "", roles: ["STAFF"] },
  { label: "Personal",        href: "/self-service/profile",         icon: "UserCircle", roles: ["STAFF"] },
  { label: "Change Password", href: "/self-service/change-password", icon: "Settings",   roles: ["STAFF"] },
  { label: "FAQ",             href: "/faq",                          icon: "HelpCircle", roles: ["STAFF"] },

  // ── PROJECT LEAD items ────────────────────────────────────────────────────────
  { label: "Dashboard",    href: "/dashboard",             icon: "LayoutDashboard", roles: ["PROJECT_LEAD"] },
  { label: "__spacer_pl__", spacer: true, icon: "", roles: ["PROJECT_LEAD"] },
  { label: "People",         href: "/people",         icon: "UserCheck",     roles: ["PROJECT_LEAD"] },
  { label: "My Team",       href: "/team",           icon: "Users",         roles: ["PROJECT_LEAD"] },
  { label: "Projects",      href: "/projects",       icon: "FolderKanban",  roles: ["PROJECT_LEAD"] },
  { label: "Intern Reports",href: "/intern-reports", icon: "ClipboardList", roles: ["PROJECT_LEAD"], permission: "canReviewInternReports" },
  { label: "Leave Requests",       href: "/requests",    icon: "CalendarDays", roles: ["PROJECT_LEAD"] },
  { label: "Bus Booking Requests", href: "/requests/bus", icon: "Bus",          roles: ["PROJECT_LEAD"] },
  { label: "Documents",    href: "/documents",             icon: "FolderOpen",      roles: ["PROJECT_LEAD"] },
  { label: "Surveys",      href: "/surveys",               icon: "ClipboardList",   roles: ["PROJECT_LEAD"] },
  { label: "Benefits",     href: "/benefits",              icon: "Gift",            roles: ["PROJECT_LEAD"] },
  {
    label: "Performance", icon: "TrendingUp", roles: ["PROJECT_LEAD"],
    children: [
      { label: "Overview",         href: "/performance", exact: true },
      { label: "My Appraisal",     href: "/performance/my" },
      { label: "Peer Reviews",     href: "/performance/peer-reviews" },
      { label: "Team Lead Review", href: "/performance/team-lead-review" },
      { label: "To Review",        href: "/performance/to-review" },
      { label: "Leaderboards",     href: "/performance/leaderboards" },
    ],
  },
  { label: "Assets",       href: "/assets",                icon: "Package",         roles: ["PROJECT_LEAD"] },
  { label: "Disciplinary", href: "/disciplinary",          icon: "Scale",           roles: ["PROJECT_LEAD"] },
  { label: "__spacer_bottom_pl__", spacer: true, icon: "", roles: ["PROJECT_LEAD"] },
  { label: "Personal",        href: "/self-service/profile",         icon: "UserCircle", roles: ["PROJECT_LEAD"] },
  { label: "Change Password", href: "/self-service/change-password", icon: "Settings",   roles: ["PROJECT_LEAD"] },
  { label: "FAQ",             href: "/faq",                          icon: "HelpCircle", roles: ["PROJECT_LEAD"] },
]

// ─── CAPABILITY FLAGS ────────────────────────────────────────────────────────

export interface RoleCapabilities {
  canViewAllEmployees: boolean
  canViewTeamEmployees: boolean
  canCreateEmployee: boolean
  canEditAnyEmployee: boolean
  canViewAllLeave: boolean
  canViewTeamLeave: boolean
  canApproveLeave: boolean
  canSubmitLeave: boolean
  canManageRecruitment: boolean
  canViewRecruitment: boolean
  canManagePerformanceCycles: boolean
  canViewAllPerformance: boolean
  canViewTeamPerformance: boolean
  canSubmitOwnKPI: boolean
  canScoreKPIs: boolean
  canManageOnboarding: boolean
  canViewOwnOnboarding: boolean
  canManageOffboarding: boolean
  canManageSettings: boolean
  canViewAnalytics: boolean
  canViewTeamAnalytics: boolean
  canReviewInternReports: boolean
  isReadOnly: boolean
}

export const ROLE_CAPABILITIES: Record<SystemRole, RoleCapabilities> = {
  SUPER_ADMIN: {
    canViewAllEmployees: true,  canViewTeamEmployees: true,
    canCreateEmployee: true,    canEditAnyEmployee: true,
    canViewAllLeave: true,      canViewTeamLeave: true,
    canApproveLeave: true,      canSubmitLeave: true,
    canManageRecruitment: true, canViewRecruitment: true,
    canManagePerformanceCycles: true, canViewAllPerformance: true,
    canViewTeamPerformance: true, canSubmitOwnKPI: true, canScoreKPIs: true,
    canManageOnboarding: true,  canViewOwnOnboarding: true,
    canManageOffboarding: true,
    canManageSettings: true,
    canViewAnalytics: true,     canViewTeamAnalytics: true,
    canReviewInternReports: true,
    isReadOnly: false,
  },
  PROJECT_LEAD: {
    canViewAllEmployees: false, canViewTeamEmployees: true,
    canCreateEmployee: false,   canEditAnyEmployee: false,
    canViewAllLeave: false,     canViewTeamLeave: true,
    canApproveLeave: true,      canSubmitLeave: true,
    canManageRecruitment: false, canViewRecruitment: false,
    canManagePerformanceCycles: false, canViewAllPerformance: false,
    canViewTeamPerformance: true, canSubmitOwnKPI: true, canScoreKPIs: true,
    canManageOnboarding: false, canViewOwnOnboarding: true,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: false,    canViewTeamAnalytics: true,
    canReviewInternReports: true,
    isReadOnly: false,
  },
  STAFF: {
    canViewAllEmployees: false, canViewTeamEmployees: false,
    canCreateEmployee: false,   canEditAnyEmployee: false,
    canViewAllLeave: false,     canViewTeamLeave: false,
    canApproveLeave: false,     canSubmitLeave: true,
    canManageRecruitment: false, canViewRecruitment: false,
    canManagePerformanceCycles: false, canViewAllPerformance: false,
    canViewTeamPerformance: false, canSubmitOwnKPI: true, canScoreKPIs: false,
    canManageOnboarding: false, canViewOwnOnboarding: true,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: false,    canViewTeamAnalytics: false,
    canReviewInternReports: false,
    isReadOnly: false,
  },
}

// ─── ROLE SLUGS & HELPERS ────────────────────────────────────────────────────

export const ROLE_SLUGS: Record<SystemRole, string> = {
  SUPER_ADMIN:   "admin",
  PROJECT_LEAD:  "project-lead",
  STAFF:         "staff",
}

export function getRoleHome(role: string): string {
  return `/${ROLE_SLUGS[role as SystemRole] ?? "staff"}`
}

export function getCapabilities(role: string): RoleCapabilities {
  return ROLE_CAPABILITIES[role as SystemRole] ?? ROLE_CAPABILITIES.STAFF
}

export function getNavForRole(role: string, isIntern?: boolean): NavItem[] {
  return NAV_ITEMS.filter(item => {
    if (!item.roles.includes(role as NavPanelRole)) return false
    if (item.requiresIntern && !isIntern) return false
    if (item.hideForIntern && isIntern) return false
    return true
  })
}

export function getNavForRoleWithPrefix(role: NavPanelRole): NavItem[] {
  const navRole: NavPanelRole = role === "SUPER_ADMIN" ? "ADMIN" : role
  const base = role === "ADMIN" ? "/admin" : getRoleHome(role as SystemRole)
  const mapHref = (href: string): string => {
    if (href === "/dashboard") return base
    return `${base}${href}`
  }
  return NAV_ITEMS
    .filter(item => {
      if (role !== "ADMIN" && item.skipForRoles?.includes(role as SystemRole)) return false
      return item.roles.includes(navRole) || (role === "SUPER_ADMIN" && item.roles.includes("SUPER_ADMIN"))
    })
    .map(item => ({
      ...item,
      href: item.href ? mapHref(item.href) : undefined,
      children: item.children?.map(c => ({ ...c, href: mapHref(c.href) })),
    }))
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN:  "Super Admin",
    PROJECT_LEAD: "Project Lead",
    STAFF:        "Staff",
  }
  return labels[role] ?? role
}
