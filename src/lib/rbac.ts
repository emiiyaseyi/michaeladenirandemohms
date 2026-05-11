// ─── RBAC — Role-Based Access Control ───────────────────────────────────────

export type SystemRole = "SUPER_ADMIN" | "ADMIN" | "STAFF"

export interface ChildNavItem {
  label: string
  href: string
  excludeRoles?: SystemRole[]
  exact?: boolean
}

export interface NavItem {
  label: string
  href?: string
  icon: string
  roles: SystemRole[]
  section?: string
  children?: ChildNavItem[]
  indent?: boolean
  skipForRoles?: SystemRole[]
  spacer?: boolean
}

export const ALL_ROLES: SystemRole[] = ["SUPER_ADMIN", "ADMIN", "STAFF"]

export const NAV_ITEMS: NavItem[] = [

  // ── Top ─────────────────────────────────────────────────────────────────────
  { label: "Dashboard",       href: "/dashboard",       icon: "LayoutDashboard", roles: ALL_ROLES },
  { label: "Company Details", href: "/company-details", icon: "Building2",       roles: ["SUPER_ADMIN"] },

  // Spacers — visual gap after the top items, role-specific
  { label: "__spacer_top_admin__", spacer: true, icon: "", roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "__spacer_top_staff__", spacer: true, icon: "", roles: ["STAFF"] },

  // ── STAFF items after spacer ─────────────────────────────────────────────────
  { label: "People",    href: "/people",  icon: "Users",    roles: ["STAFF"] },
  { label: "Job & Pay", href: "/job-pay", icon: "Banknote", roles: ["STAFF"] },

  // ── PEOPLE ──────────────────────────────────────────────────────────────────
  {
    label: "People", icon: "Users", roles: ["ADMIN"], section: "PEOPLE",
    children: [
      { label: "Employees",        href: "/people/employees" },
      { label: "Departments",      href: "/people/departments" },
      { label: "Teams",            href: "/people/teams" },
      { label: "Managers",         href: "/people/managers" },
      { label: "Custom Groups",    href: "/people/custom-groups" },
      { label: "Offers",           href: "/people/offers" },
      { label: "Exits",            href: "/people/exits" },
      { label: "External Admins",  href: "/people/external-admins" },
      { label: "Confirmation",     href: "/people/confirmation" },
      { label: "Org. Chart",       href: "/people/org-chart" },
      { label: "Job Titles",       href: "/people/job-titles" },
      { label: "Profile Requests", href: "/people/profile-requests" },
    ],
  },
  {
    label: "Hiring", icon: "Briefcase", roles: ["ADMIN"],
    children: [
      { label: "Overview",   href: "/recruitment" },
      { label: "Jobs",       href: "/recruitment/jobs" },
      { label: "Applicants", href: "/recruitment/applicants" },
      { label: "Settings",   href: "/recruitment/settings" },
    ],
  },

  // Requests — dropdown for admin, flat link for staff
  {
    label: "Requests", icon: "Receipt", roles: ["ADMIN"],
    children: [
      { label: "Loans",           href: "/requests/loans" },
      { label: "Salary Advances", href: "/requests/salary-advances" },
      { label: "Leave",           href: "/requests/leave" },
      { label: "Exits",           href: "/requests/exits" },
      { label: "Redeployments",   href: "/requests/redeployments" },
      { label: "Documents",       href: "/requests/documents" },
    ],
  },
  { label: "Requests", href: "/requests", icon: "Receipt", roles: ["STAFF"] },

  // Documents before Surveys (staff order)
  { label: "Documents",   href: "/documents",   icon: "FolderOpen",    roles: ALL_ROLES },
  { label: "Surveys",     href: "/surveys",     icon: "ClipboardList", roles: ALL_ROLES },
  { label: "Contractors", href: "/contractors", icon: "UserCheck",     roles: ["ADMIN"] },

  // ── COMPENSATION ─────────────────────────────────────────────────────────────
  { label: "Benefits", href: "/benefits", icon: "Gift", roles: ["ADMIN"], section: "COMPENSATION" },
  { label: "Benefits", href: "/benefits", icon: "Gift", roles: ["STAFF"] },
  { label: "Payslips", href: "/self-service/payslips", icon: "Receipt", roles: ["STAFF"] },

  // ── PRODUCTIVITY ─────────────────────────────────────────────────────────────
  {
    label: "Performance", icon: "TrendingUp", roles: ALL_ROLES, section: "PRODUCTIVITY",
    children: [
      { label: "Overview",      href: "/performance", exact: true },
      { label: "Period",        href: "/performance/period",        excludeRoles: ["STAFF"] },
      { label: "Objectives",    href: "/performance/objectives" },
      { label: "Groups",        href: "/performance/groups",        excludeRoles: ["STAFF"] },
      { label: "Reviews",       href: "/performance/reviews" },
      { label: "Conversations", href: "/performance/conversations" },
      { label: "Feedback",      href: "/performance/feedback" },
    ],
  },
  { label: "Projects",  href: "/projects",  icon: "Layers",  roles: ["ADMIN"] },
  { label: "Assets",    href: "/assets",    icon: "Package", roles: ["STAFF"] },
  {
    label: "Time Tracking", icon: "Clock", roles: ["ADMIN"],
    children: [
      { label: "Absence", href: "/time-tracking/absence" },
    ],
  },
  {
    label: "Disciplinary", icon: "Scale", roles: ["ADMIN"],
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
      { label: "HR & Payroll",        href: "/settings/hr-payroll" },
      { label: "Departments",         href: "/settings/departments" },
      { label: "Leave Types",         href: "/settings/leave-types" },
      { label: "Public Holidays",     href: "/settings/public-holidays" },
      { label: "Approval Workflows",  href: "/settings/approval-workflows" },
      { label: "Customization",       href: "/settings/customization" },
      { label: "Roles & Permissions", href: "/settings/roles-permissions" },
    ],
  },
  { label: "Reports",       href: "/reports",       icon: "BarChart2",  roles: ["ADMIN"], section: "OTHER" },
  {
    label: "Assets", icon: "Package", roles: ["ADMIN"],
    children: [
      { label: "Overview",    href: "/assets/overview" },
      { label: "Assignments", href: "/assets/assignments" },
    ],
  },
  { label: "Rent Documents", href: "/rent-documents", icon: "House",    roles: ["ADMIN"] },
  { label: "Audit Log",      href: "/audit-log",      icon: "FileText", roles: ["ADMIN"] },
  {
    label: "Announcements", icon: "Megaphone", roles: ["ADMIN"],
    children: [
      { label: "Overview", href: "/announcements" },
      { label: "Groups",   href: "/announcements/groups" },
    ],
  },
  { label: "Analytics", href: "/analytics", icon: "BarChart3", roles: ["ADMIN"] },
  { label: "Trash",     href: "/trash",     icon: "Trash2",    roles: ["ADMIN"] },

  // ── EXTRAS ───────────────────────────────────────────────────────────────────
  { label: "Preferences", href: "/preferences", icon: "UserCircle", roles: ["SUPER_ADMIN"],           section: "EXTRAS" },
  { label: "Calendar",    href: "/calendar",    icon: "Calendar",   roles: ["SUPER_ADMIN", "ADMIN"],  section: "EXTRAS" },
  { label: "FAQ",         href: "/faq",         icon: "HelpCircle", roles: ["SUPER_ADMIN", "ADMIN"] },

  // ── STAFF bottom group ───────────────────────────────────────────────────────
  { label: "__spacer_bottom_staff__", spacer: true, icon: "", roles: ["STAFF"] },
  { label: "Personal",        href: "/self-service/profile",         icon: "UserCircle", roles: ["STAFF"] },
  { label: "Change Password", href: "/self-service/change-password", icon: "Settings",   roles: ["STAFF"] },
  { label: "FAQ",             href: "/faq",                          icon: "HelpCircle", roles: ["STAFF"] },
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
    isReadOnly: false,
  },
  ADMIN: {
    canViewAllEmployees: true,  canViewTeamEmployees: true,
    canCreateEmployee: true,    canEditAnyEmployee: true,
    canViewAllLeave: true,      canViewTeamLeave: true,
    canApproveLeave: true,      canSubmitLeave: true,
    canManageRecruitment: true, canViewRecruitment: true,
    canManagePerformanceCycles: true, canViewAllPerformance: true,
    canViewTeamPerformance: true, canSubmitOwnKPI: true, canScoreKPIs: true,
    canManageOnboarding: true,  canViewOwnOnboarding: true,
    canManageOffboarding: true,
    canManageSettings: false,
    canViewAnalytics: true,     canViewTeamAnalytics: true,
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
    isReadOnly: false,
  },
}

// ─── ROLE SLUGS & HELPERS ────────────────────────────────────────────────────

export const ROLE_SLUGS: Record<SystemRole, string> = {
  SUPER_ADMIN: "admin",
  ADMIN:       "admin",
  STAFF:       "staff",
}

export function getRoleHome(role: string): string {
  return `/${ROLE_SLUGS[role as SystemRole] ?? "staff"}`
}

export function getCapabilities(role: string): RoleCapabilities {
  return ROLE_CAPABILITIES[role as SystemRole] ?? ROLE_CAPABILITIES.STAFF
}

export function getNavForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter(item => item.roles.includes(role as SystemRole))
}

export function getNavForRoleWithPrefix(role: SystemRole): NavItem[] {
  const navRole: SystemRole = role === "SUPER_ADMIN" ? "ADMIN" : role
  const base = getRoleHome(role)
  const mapHref = (href: string): string => {
    if (href === "/dashboard") return base
    return `${base}${href}`
  }
  return NAV_ITEMS
    .filter(item => {
      if (item.skipForRoles?.includes(role)) return false
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
    SUPER_ADMIN: "Super Admin",
    ADMIN:       "Admin",
    STAFF:       "Staff",
  }
  return labels[role] ?? role
}
