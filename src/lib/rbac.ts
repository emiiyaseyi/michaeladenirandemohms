// ─── RBAC — Role-Based Access Control ───────────────────────────────────────

export type SystemRole = "SUPER_ADMIN" | "ADMIN" | "PROJECT_LEAD" | "STAFF"

export interface ChildNavItem {
  label: string
  href: string
  excludeRoles?: SystemRole[]
}

export interface NavItem {
  label: string
  href?: string
  icon: string
  roles: SystemRole[]
  section?: string
  children?: ChildNavItem[]
  indent?: boolean
}

export const ALL_ROLES: SystemRole[] = ["SUPER_ADMIN", "ADMIN", "PROJECT_LEAD", "STAFF"]

export const NAV_ITEMS: NavItem[] = [

  // ── Top ─────────────────────────────────────────────────────────────────────
  { label: "Dashboard",       href: "/dashboard",       icon: "LayoutDashboard", roles: ALL_ROLES },
  { label: "Company Details", href: "/company-details", icon: "Building2", roles: ["SUPER_ADMIN"] },

  // Self-service items for STAFF/PROJECT_LEAD — standalone at top
  { label: "My Profile",       href: "/self-service/profile",          icon: "UserCircle",   roles: ["PROJECT_LEAD", "STAFF"] },
  { label: "My Payslips",      href: "/self-service/payslips",         icon: "Receipt",      roles: ["PROJECT_LEAD", "STAFF"] },
  { label: "Grievance",        href: "/self-service/grievance",        icon: "MessageSquare", roles: ["PROJECT_LEAD", "STAFF"] },
  { label: "Change Password",  href: "/self-service/change-password",  icon: "Settings",     roles: ["PROJECT_LEAD", "STAFF"] },

  // ── PEOPLE ──────────────────────────────────────────────────────────────────
  {
    label: "People", icon: "Users", roles: ["ADMIN", "PROJECT_LEAD"], section: "PEOPLE",
    children: [
      { label: "Employees",          href: "/people/employees",          excludeRoles: ["PROJECT_LEAD"] },
      { label: "Departments",        href: "/people/departments",        excludeRoles: ["PROJECT_LEAD"] },
      { label: "Teams",              href: "/people/teams" },
      { label: "Managers",           href: "/people/managers",           excludeRoles: ["PROJECT_LEAD"] },
      { label: "Custom Groups",      href: "/people/custom-groups",      excludeRoles: ["PROJECT_LEAD"] },
      { label: "Offers",             href: "/people/offers",             excludeRoles: ["PROJECT_LEAD"] },
      { label: "Exits",              href: "/people/exits" },
      { label: "External Admins",    href: "/people/external-admins",    excludeRoles: ["PROJECT_LEAD"] },
      { label: "Confirmation",       href: "/people/confirmation" },
      { label: "Org. Chart",         href: "/people/org-chart" },
      { label: "Job Titles",         href: "/people/job-titles",         excludeRoles: ["PROJECT_LEAD"] },
      { label: "Profile Requests",   href: "/people/profile-requests",   excludeRoles: ["PROJECT_LEAD"] },
      { label: "Personal Documents", href: "/people/personal-docs",      excludeRoles: ["PROJECT_LEAD"] },
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
  {
    label: "Requests", icon: "Receipt", roles: ALL_ROLES,
    children: [
      { label: "Loans",           href: "/requests/loans",           excludeRoles: ["PROJECT_LEAD", "STAFF"] },
      { label: "Salary Advances", href: "/requests/salary-advances", excludeRoles: ["PROJECT_LEAD", "STAFF"] },
      { label: "Leave",           href: "/requests/leave" },
      { label: "Exit",            href: "/self-service/exit",        excludeRoles: ["ADMIN", "SUPER_ADMIN"] },
      { label: "Exits",           href: "/requests/exits",           excludeRoles: ["PROJECT_LEAD", "STAFF"] },
      { label: "Redeployments",   href: "/requests/redeployments",   excludeRoles: ["PROJECT_LEAD", "STAFF"] },
      { label: "Documents",       href: "/requests/documents",       excludeRoles: ["PROJECT_LEAD", "STAFF"] },
    ],
  },
  { label: "Surveys",   href: "/surveys",   icon: "ClipboardList", roles: ALL_ROLES },
  { label: "Documents", href: "/documents", icon: "FolderOpen",    roles: ALL_ROLES },

  // ── COMPENSATION ─────────────────────────────────────────────────────────────
  { label: "Benefits", href: "/benefits", icon: "Gift", roles: ["ADMIN"], section: "COMPENSATION" },

  { label: "Job & Pay", href: "/job-pay", icon: "Banknote", roles: ["PROJECT_LEAD", "STAFF"], section: "COMPENSATION" },
  { label: "Benefits",  href: "/benefits", icon: "Gift",    roles: ["PROJECT_LEAD", "STAFF"] },

  // ── PRODUCTIVITY ─────────────────────────────────────────────────────────────
  {
    label: "Performance", icon: "TrendingUp", roles: ALL_ROLES, section: "PRODUCTIVITY",
    children: [
      { label: "Overview",      href: "/performance" },
      { label: "Setup",         href: "/performance/setup",         excludeRoles: ["PROJECT_LEAD", "STAFF"] },
      { label: "Period",        href: "/performance/period",        excludeRoles: ["PROJECT_LEAD", "STAFF"] },
      { label: "Objectives",    href: "/performance/objectives" },
      { label: "Groups",        href: "/performance/groups",        excludeRoles: ["STAFF"] },
      { label: "Reviews",       href: "/performance/reviews" },
      { label: "Conversations", href: "/performance/conversations" },
      { label: "Feedback",      href: "/performance/feedback" },
    ],
  },
  { label: "Projects",    href: "/projects",    icon: "Layers",        roles: ALL_ROLES },
  { label: "Assets",      href: "/assets",      icon: "Package",       roles: ["PROJECT_LEAD", "STAFF"] },
  {
    label: "Time Tracking", icon: "Clock", roles: ["ADMIN", "PROJECT_LEAD"],
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
  { label: "Disciplinary", href: "/disciplinary", icon: "Scale",     roles: ["PROJECT_LEAD", "STAFF"] },
  { label: "Onboarding",  href: "/onboarding",  icon: "UserCheck", roles: ["ADMIN"] },
  { label: "Offboarding", href: "/offboarding", icon: "UserMinus", roles: ["ADMIN"] },

  // ── OTHER ────────────────────────────────────────────────────────────────────
  {
    label: "Settings", icon: "Settings", roles: ["ADMIN"], section: "OTHER",
    children: [
      { label: "Overview",            href: "/settings" },
      { label: "Admins",              href: "/settings/admins" },
      { label: "HR & Payroll",        href: "/settings/hr-payroll" },
      { label: "Plan & Billing",      href: "/settings/plan-billing" },
      { label: "Customization",       href: "/settings/customization" },
      { label: "Approval Workflows",  href: "/settings/approval-workflows" },
      { label: "Single Sign-On",      href: "/settings/single-sign-on" },
      { label: "Roles & Permissions", href: "/settings/roles-permissions" },
    ],
  },
  { label: "Reports", href: "/reports", icon: "BarChart2", roles: ["ADMIN"] },
  {
    label: "Assets", icon: "Package", roles: ["ADMIN"],
    children: [
      { label: "Overview",    href: "/assets/overview" },
      { label: "Assignments", href: "/assets/assignments" },
    ],
  },
  { label: "Rent Documents", href: "/rent-documents", icon: "FileText",  roles: ["ADMIN"] },
  { label: "Audit Log",      href: "/audit-log",      icon: "FileText",  roles: ["ADMIN"] },
  {
    label: "Announcements", icon: "Megaphone", roles: ALL_ROLES,
    children: [
      { label: "Overview", href: "/announcements" },
      { label: "Groups",   href: "/announcements/groups" },
    ],
  },
  { label: "Analytics", href: "/analytics", icon: "BarChart3", roles: ["ADMIN"] },
  { label: "Trash",     href: "/trash",     icon: "Trash2",    roles: ["ADMIN"] },

  // ── EXTRAS ───────────────────────────────────────────────────────────────────
  {
    label: "Self Service", icon: "UserCircle", roles: ["SUPER_ADMIN", "ADMIN"], section: "EXTRAS",
    children: [
      { label: "Profile",          href: "/self-service/profile" },
      { label: "Payslips",         href: "/self-service/payslips" },
      { label: "Requisition",      href: "/self-service/requisitions" },
      { label: "Grievance",        href: "/self-service/grievance" },
      { label: "Exit",             href: "/self-service/exit" },
      { label: "Change Password",  href: "/self-service/change-password" },
    ],
  },
  { label: "FAQ",      href: "/faq",      icon: "HelpCircle", roles: ALL_ROLES },
  { label: "Calendar", href: "/calendar", icon: "Calendar",   roles: ["SUPER_ADMIN", "ADMIN"] },
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
    canManageSettings: true,
    canViewAnalytics: true,     canViewTeamAnalytics: true,
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
  PROJECT_LEAD:   "project-lead",
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
    .filter(item => item.roles.includes(navRole) || (role === "SUPER_ADMIN" && item.roles.includes("SUPER_ADMIN")))
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
    PROJECT_LEAD:   "Project Lead",
    STAFF:       "Staff",
  }
  return labels[role] ?? role
}
