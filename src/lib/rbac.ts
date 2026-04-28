// ─── RBAC — Role-Based Access Control ───────────────────────────────────────

export type SystemRole = "ADMIN" | "TEAM_LEAD" | "STAFF"

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

export const ALL_ROLES: SystemRole[] = ["ADMIN", "TEAM_LEAD", "STAFF"]

export const NAV_ITEMS: NavItem[] = [

  // ── Top ─────────────────────────────────────────────────────────────────────
  { label: "Dashboard",       href: "/dashboard",       icon: "LayoutDashboard", roles: ALL_ROLES },
  { label: "Company Details", href: "/company-details", icon: "Building2",       roles: ["ADMIN"] },

  // ── PEOPLE ──────────────────────────────────────────────────────────────────
  {
    label: "People", icon: "Users", roles: ["ADMIN", "TEAM_LEAD"], section: "PEOPLE",
    children: [
      { label: "Employees",          href: "/people/employees",          excludeRoles: ["TEAM_LEAD"] },
      { label: "Needs Attention",    href: "/people/needs-attention",    excludeRoles: ["TEAM_LEAD"] },
      { label: "Departments",        href: "/people/departments",        excludeRoles: ["TEAM_LEAD"] },
      { label: "Teams",              href: "/people/teams" },
      { label: "Documents",          href: "/people/documents",          excludeRoles: ["ADMIN"] },
      { label: "Managers",           href: "/people/managers",           excludeRoles: ["TEAM_LEAD"] },
      { label: "Custom Groups",      href: "/people/custom-groups",      excludeRoles: ["TEAM_LEAD"] },
      { label: "Offers",             href: "/people/offers",             excludeRoles: ["TEAM_LEAD"] },
      { label: "Exits",              href: "/people/exits" },
      { label: "External Admins",    href: "/people/external-admins",    excludeRoles: ["TEAM_LEAD"] },
      { label: "Confirmation",       href: "/people/confirmation" },
      { label: "Org. Chart",         href: "/people/org-chart" },
      { label: "Job Titles",         href: "/people/job-titles",         excludeRoles: ["TEAM_LEAD"] },
      { label: "Profile Requests",   href: "/people/profile-requests",   excludeRoles: ["TEAM_LEAD"] },
      { label: "Personal Documents", href: "/people/personal-docs",      excludeRoles: ["TEAM_LEAD"] },
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
      { label: "Loans",           href: "/requests/loans",           excludeRoles: ["TEAM_LEAD", "STAFF"] },
      { label: "Salary Advances", href: "/requests/salary-advances", excludeRoles: ["TEAM_LEAD", "STAFF"] },
      { label: "Leave",           href: "/requests/leave" },
      { label: "Exits",           href: "/requests/exits",           excludeRoles: ["TEAM_LEAD", "STAFF"] },
      { label: "Redeployments",   href: "/requests/redeployments",   excludeRoles: ["TEAM_LEAD", "STAFF"] },
      { label: "Documents",       href: "/requests/documents",       excludeRoles: ["TEAM_LEAD", "STAFF"] },
    ],
  },
  { label: "Surveys",     href: "/surveys",     icon: "ClipboardList", roles: ALL_ROLES },
  { label: "Documents",   href: "/documents",   icon: "FolderOpen",    roles: ALL_ROLES },
  { label: "Contractors", href: "/contractors", icon: "Users",         roles: ["ADMIN"] },

  // ── COMPENSATION ─────────────────────────────────────────────────────────────
  {
    label: "Payroll", icon: "DollarSign", roles: ["ADMIN"], section: "COMPENSATION",
    children: [
      { label: "Overview",       href: "/payroll/overview" },
      { label: "Changes",        href: "/payroll/changes" },
      { label: "Records",        href: "/payroll/records" },
      { label: "Skip Employees", href: "/payroll/skip-employees" },
      { label: "History",        href: "/payroll/history" },
      { label: "Configuration",  href: "/payroll/configuration" },
    ],
  },
  {
    label: "Pay Schedules", icon: "CalendarDays", roles: ["ADMIN"],
    children: [
      { label: "Regular",   href: "/pay-schedules/regular" },
      { label: "Custom",    href: "/pay-schedules/custom" },
      { label: "Reversals", href: "/pay-schedules/reversals" },
    ],
  },
  {
    label: "Wallets", icon: "Wallet", roles: ["ADMIN"],
    children: [
      { label: "Overview",     href: "/wallets/overview" },
      { label: "Transfers",    href: "/wallets/transfers" },
      { label: "Transactions", href: "/wallets/transactions" },
      { label: "Integration",  href: "/wallets/integration" },
    ],
  },
  {
    label: "Earned Wage Access", icon: "TrendingUp", roles: ["ADMIN"],
    children: [
      { label: "Analytics",         href: "/earned-wage-access/analytics" },
      { label: "Employees",         href: "/earned-wage-access/employees" },
      { label: "Withdrawals",       href: "/earned-wage-access/withdrawals" },
      { label: "Payment",           href: "/earned-wage-access/payment" },
      { label: "Policy Management", href: "/earned-wage-access/policy-management" },
    ],
  },
  { label: "Benefits", href: "/benefits", icon: "Gift", roles: ["ADMIN"] },

  { label: "Job & Pay", href: "/job-pay", icon: "Banknote", roles: ["TEAM_LEAD", "STAFF"], section: "COMPENSATION" },
  { label: "Benefits",  href: "/benefits", icon: "Gift",    roles: ["TEAM_LEAD", "STAFF"] },
  {
    label: "Wallet", icon: "Wallet", roles: ["TEAM_LEAD", "STAFF"],
    children: [
      { label: "Overview",          href: "/wallet/overview" },
      { label: "Transactions",      href: "/wallet/transactions" },
      { label: "Transfers",         href: "/wallet/transfers" },
      { label: "Earned Wage Access", href: "/wallet/earned-wage-access" },
    ],
  },

  // ── PRODUCTIVITY ─────────────────────────────────────────────────────────────
  {
    label: "Performance", icon: "TrendingUp", roles: ALL_ROLES, section: "PRODUCTIVITY",
    children: [
      { label: "Overview",      href: "/performance" },
      { label: "Setup",         href: "/performance/setup",         excludeRoles: ["TEAM_LEAD", "STAFF"] },
      { label: "Period",        href: "/performance/period",        excludeRoles: ["TEAM_LEAD", "STAFF"] },
      { label: "Objectives",    href: "/performance/objectives" },
      { label: "Groups",        href: "/performance/groups",        excludeRoles: ["STAFF"] },
      { label: "Reviews",       href: "/performance/reviews" },
      { label: "Ratings",       href: "/performance/ratings",       excludeRoles: ["STAFF"] },
      { label: "Conversations", href: "/performance/conversations" },
      { label: "Feedback",      href: "/performance/feedback" },
    ],
  },
  { label: "Projects",    href: "/projects",    icon: "Layers",        roles: ALL_ROLES },
  { label: "Tasks",       href: "/tasks",       icon: "ClipboardList", roles: ALL_ROLES },
  { label: "Assets",      href: "/assets",      icon: "Package",       roles: ["TEAM_LEAD", "STAFF"] },
  {
    label: "Time Tracking", icon: "Clock", roles: ["ADMIN", "TEAM_LEAD"],
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
  { label: "Disciplinary", href: "/disciplinary", icon: "Scale",     roles: ["TEAM_LEAD", "STAFF"] },
  { label: "Onboarding",  href: "/onboarding",  icon: "UserCheck", roles: ["ADMIN"] },
  { label: "Offboarding", href: "/offboarding", icon: "UserMinus", roles: ["ADMIN"] },

  // ── OTHER ────────────────────────────────────────────────────────────────────
  {
    label: "Settings", icon: "Settings", roles: ["ADMIN"], section: "OTHER",
    children: [
      { label: "Admins",              href: "/settings/admins" },
      { label: "HR & Payroll",        href: "/settings/hr-payroll" },
      { label: "Plan & Billing",      href: "/settings/plan-billing" },
      { label: "Customization",       href: "/settings/customization" },
      { label: "Approval Workflows",  href: "/settings/approval-workflows" },
      { label: "Single Sign-On",      href: "/settings/single-sign-on" },
      { label: "Roles & Permissions", href: "/settings/roles-permissions" },
    ],
  },
  {
    label: "Reports", icon: "BarChart2", roles: ["ADMIN"],
    children: [
      { label: "Payroll Reports",  href: "/reports/payroll-reports" },
      { label: "Employee Reports", href: "/reports/employee-reports" },
      { label: "Custom Reports",   href: "/reports/custom-reports" },
    ],
  },
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
    label: "Self Service", icon: "UserCircle", roles: ALL_ROLES, section: "EXTRAS",
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
  { label: "Calendar", href: "/calendar", icon: "Calendar",   roles: ALL_ROLES },
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
  TEAM_LEAD: {
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
  ADMIN:     "admin",
  TEAM_LEAD: "team-lead",
  STAFF:     "staff",
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
  const base = getRoleHome(role)
  const mapHref = (href: string): string => {
    if (href === "/dashboard") return base
    return `${base}${href}`
  }
  return NAV_ITEMS
    .filter(item => item.roles.includes(role))
    .map(item => ({
      ...item,
      href: item.href ? mapHref(item.href) : undefined,
      children: item.children?.map(c => ({ ...c, href: mapHref(c.href) })),
    }))
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN:     "Admin",
    TEAM_LEAD: "Team Lead",
    STAFF:     "Staff",
  }
  return labels[role] ?? role
}
