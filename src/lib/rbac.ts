// ─── RBAC — Role-Based Access Control ───────────────────────────────────────
// Single source of truth for all permission checks in the system.

import {
  LayoutDashboard, Users, CalendarDays, Briefcase, TrendingUp,
  UserCheck, UserMinus, GitBranch, BarChart3, Settings, UserCircle,
  FolderOpen, Layers, Megaphone, HelpCircle, BarChart2, Receipt, Building2, type LucideIcon,
} from "lucide-react"

export type SystemRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "HR_ADMIN"
  | "MANAGER"
  | "DEPARTMENT_LEAD"
  | "PROJECT_MANAGER"
  | "STAFF"
  | "INTERN"
  | "TA_OFFICER"
  | "PERFORMANCE_OFFICER"
  | "AUDIT"

// ─── NAV ITEMS ───────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles: SystemRole[]
}

export const ALL_ROLES: SystemRole[] = [
  "SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD",
  "PROJECT_MANAGER", "STAFF", "INTERN", "TA_OFFICER", "PERFORMANCE_OFFICER", "AUDIT",
]

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    label: "Self Service",
    href: "/self-service",
    icon: UserCircle,
    roles: ALL_ROLES,
  },
  {
    label: "Employees",
    href: "/employees",
    icon: Users,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "AUDIT"],
  },
  {
    // Leave approval/admin view — staff access leave via Self Service
    label: "Leave",
    href: "/leave",
    icon: CalendarDays,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "PROJECT_MANAGER", "TA_OFFICER", "PERFORMANCE_OFFICER", "AUDIT"],
  },
  {
    label: "Recruitment",
    href: "/recruitment",
    icon: Briefcase,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "TA_OFFICER", "MANAGER", "DEPARTMENT_LEAD", "PROJECT_MANAGER", "AUDIT"],
  },
  {
    label: "Performance",
    href: "/performance",
    icon: TrendingUp,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "PERFORMANCE_OFFICER", "MANAGER", "DEPARTMENT_LEAD", "STAFF", "INTERN", "AUDIT"],
  },
  {
    label: "Onboarding",
    href: "/onboarding",
    icon: UserCheck,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "AUDIT"],
  },
  {
    label: "Offboarding",
    href: "/offboarding",
    icon: UserMinus,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "PROJECT_MANAGER", "AUDIT"],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: Layers,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "PROJECT_MANAGER", "TA_OFFICER", "PERFORMANCE_OFFICER", "AUDIT"],
  },
  {
    label: "Departments",
    href: "/departments",
    icon: Building2,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "AUDIT"],
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FolderOpen,
    roles: ALL_ROLES,
  },
  {
    label: "Announcements",
    href: "/announcements",
    icon: Megaphone,
    roles: ALL_ROLES,
  },
  {
    label: "FAQ",
    href: "/faq",
    icon: HelpCircle,
    roles: ALL_ROLES,
  },
  {
    label: "Org Chart",
    href: "/org-chart",
    icon: GitBranch,
    roles: ALL_ROLES,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "PERFORMANCE_OFFICER", "AUDIT"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart2,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "AUDIT"],
  },
  {
    label: "Payslips",
    href: "/payslips",
    icon: Receipt,
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "ADMIN", "HR_ADMIN"],
  },
]

// ─── ROUTE PROTECTION MAP ────────────────────────────────────────────────────
// Maps route prefixes to allowed roles. Used by middleware.

export const ROUTE_ROLES: Record<string, SystemRole[]> = {
  "/dashboard":    ALL_ROLES,
  "/self-service": ALL_ROLES,
  "/employees":    ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "AUDIT"],
  "/leave":        ALL_ROLES,
  "/recruitment":  ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "TA_OFFICER", "MANAGER", "DEPARTMENT_LEAD", "PROJECT_MANAGER", "AUDIT"],
  "/performance":  ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "PERFORMANCE_OFFICER", "MANAGER", "DEPARTMENT_LEAD", "STAFF", "INTERN", "AUDIT"],
  "/onboarding":   ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "STAFF", "INTERN", "AUDIT"],
  "/offboarding":  ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "PROJECT_MANAGER", "AUDIT"],
  "/projects":     ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "PROJECT_MANAGER", "TA_OFFICER", "PERFORMANCE_OFFICER", "AUDIT"],
  "/departments":  ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "AUDIT"],
  "/documents":    ALL_ROLES,
  "/announcements": ALL_ROLES,
  "/faq":          ALL_ROLES,
  "/org-chart":    ALL_ROLES,
  "/analytics":    ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_LEAD", "PERFORMANCE_OFFICER", "AUDIT"],
  "/reports":      ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "AUDIT"],
  "/payslips":     ["SUPER_ADMIN", "HR_ADMIN"],
  "/settings":     ["SUPER_ADMIN", "ADMIN", "HR_ADMIN"],
}

// ─── CAPABILITY FLAGS ────────────────────────────────────────────────────────
// Fine-grained capabilities used in API routes and UI components.

export interface RoleCapabilities {
  // Employees
  canViewAllEmployees: boolean       // see org-wide employee list
  canViewTeamEmployees: boolean      // see only own team / dept
  canCreateEmployee: boolean
  canEditAnyEmployee: boolean

  // Leave
  canViewAllLeave: boolean           // see all leave requests org-wide
  canViewTeamLeave: boolean          // see only team's leave
  canApproveLeave: boolean
  canSubmitLeave: boolean            // submit own leave

  // Recruitment
  canManageRecruitment: boolean      // create/edit jobs, move candidates
  canViewRecruitment: boolean

  // Performance
  canManagePerformanceCycles: boolean
  canViewAllPerformance: boolean
  canViewTeamPerformance: boolean
  canSubmitOwnKPI: boolean
  canScoreKPIs: boolean              // manager scoring

  // Onboarding
  canManageOnboarding: boolean       // create/assign tasks
  canViewOwnOnboarding: boolean      // see own tasks only

  // Offboarding
  canManageOffboarding: boolean

  // Settings
  canManageSettings: boolean

  // Analytics
  canViewAnalytics: boolean
  canViewTeamAnalytics: boolean

  // Audit
  isReadOnly: boolean                // AUDIT role: no mutations
}

const full: RoleCapabilities = {
  canViewAllEmployees: true, canViewTeamEmployees: true,
  canCreateEmployee: true, canEditAnyEmployee: true,
  canViewAllLeave: true, canViewTeamLeave: true,
  canApproveLeave: true, canSubmitLeave: true,
  canManageRecruitment: true, canViewRecruitment: true,
  canManagePerformanceCycles: true, canViewAllPerformance: true,
  canViewTeamPerformance: true, canSubmitOwnKPI: true, canScoreKPIs: true,
  canManageOnboarding: true, canViewOwnOnboarding: true,
  canManageOffboarding: true,
  canManageSettings: true,
  canViewAnalytics: true, canViewTeamAnalytics: true,
  isReadOnly: false,
}

export const ROLE_CAPABILITIES: Record<SystemRole, RoleCapabilities> = {
  SUPER_ADMIN: { ...full },

  ADMIN: {
    ...full,
    canManageSettings: false, // settings limited to SUPER_ADMIN & HR_ADMIN for config
  },

  HR_ADMIN: {
    ...full,
    canManageSettings: true,
  },

  MANAGER: {
    canViewAllEmployees: false, canViewTeamEmployees: true,
    canCreateEmployee: false, canEditAnyEmployee: false,
    canViewAllLeave: false, canViewTeamLeave: true,
    canApproveLeave: true, canSubmitLeave: true,
    canManageRecruitment: false, canViewRecruitment: false,
    canManagePerformanceCycles: false, canViewAllPerformance: false,
    canViewTeamPerformance: true, canSubmitOwnKPI: true, canScoreKPIs: true,
    canManageOnboarding: true, canViewOwnOnboarding: true,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: false, canViewTeamAnalytics: true,
    isReadOnly: false,
  },

  DEPARTMENT_LEAD: {
    canViewAllEmployees: false, canViewTeamEmployees: true,
    canCreateEmployee: false, canEditAnyEmployee: false,
    canViewAllLeave: false, canViewTeamLeave: true,
    canApproveLeave: true, canSubmitLeave: true,
    canManageRecruitment: false, canViewRecruitment: false,
    canManagePerformanceCycles: false, canViewAllPerformance: false,
    canViewTeamPerformance: true, canSubmitOwnKPI: true, canScoreKPIs: true,
    canManageOnboarding: true, canViewOwnOnboarding: true,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: false, canViewTeamAnalytics: true,
    isReadOnly: false,
  },

  PROJECT_MANAGER: {
    canViewAllEmployees: false, canViewTeamEmployees: true,
    canCreateEmployee: false, canEditAnyEmployee: false,
    canViewAllLeave: false, canViewTeamLeave: false,
    canApproveLeave: false, canSubmitLeave: true,
    canManageRecruitment: false, canViewRecruitment: false,
    canManagePerformanceCycles: false, canViewAllPerformance: false,
    canViewTeamPerformance: true, canSubmitOwnKPI: true, canScoreKPIs: false,
    canManageOnboarding: false, canViewOwnOnboarding: true,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: false, canViewTeamAnalytics: false,
    isReadOnly: false,
  },

  TA_OFFICER: {
    canViewAllEmployees: false, canViewTeamEmployees: false,
    canCreateEmployee: false, canEditAnyEmployee: false,
    canViewAllLeave: false, canViewTeamLeave: false,
    canApproveLeave: false, canSubmitLeave: true,
    canManageRecruitment: true, canViewRecruitment: true,
    canManagePerformanceCycles: false, canViewAllPerformance: false,
    canViewTeamPerformance: false, canSubmitOwnKPI: true, canScoreKPIs: false,
    canManageOnboarding: false, canViewOwnOnboarding: true,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: false, canViewTeamAnalytics: false,
    isReadOnly: false,
  },

  PERFORMANCE_OFFICER: {
    canViewAllEmployees: false, canViewTeamEmployees: false,
    canCreateEmployee: false, canEditAnyEmployee: false,
    canViewAllLeave: false, canViewTeamLeave: false,
    canApproveLeave: false, canSubmitLeave: true,
    canManageRecruitment: false, canViewRecruitment: false,
    canManagePerformanceCycles: true, canViewAllPerformance: true,
    canViewTeamPerformance: true, canSubmitOwnKPI: true, canScoreKPIs: true,
    canManageOnboarding: false, canViewOwnOnboarding: true,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: true, canViewTeamAnalytics: true,
    isReadOnly: false,
  },

  STAFF: {
    canViewAllEmployees: false, canViewTeamEmployees: false,
    canCreateEmployee: false, canEditAnyEmployee: false,
    canViewAllLeave: false, canViewTeamLeave: false,
    canApproveLeave: false, canSubmitLeave: true,
    canManageRecruitment: false, canViewRecruitment: false,
    canManagePerformanceCycles: false, canViewAllPerformance: false,
    canViewTeamPerformance: false, canSubmitOwnKPI: true, canScoreKPIs: false,
    canManageOnboarding: false, canViewOwnOnboarding: true,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: false, canViewTeamAnalytics: false,
    isReadOnly: false,
  },

  INTERN: {
    canViewAllEmployees: false, canViewTeamEmployees: false,
    canCreateEmployee: false, canEditAnyEmployee: false,
    canViewAllLeave: false, canViewTeamLeave: false,
    canApproveLeave: false, canSubmitLeave: true,
    canManageRecruitment: false, canViewRecruitment: false,
    canManagePerformanceCycles: false, canViewAllPerformance: false,
    canViewTeamPerformance: false, canSubmitOwnKPI: true, canScoreKPIs: false,
    canManageOnboarding: false, canViewOwnOnboarding: true,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: false, canViewTeamAnalytics: false,
    isReadOnly: false,
  },

  AUDIT: {
    canViewAllEmployees: true, canViewTeamEmployees: true,
    canCreateEmployee: false, canEditAnyEmployee: false,
    canViewAllLeave: true, canViewTeamLeave: true,
    canApproveLeave: false, canSubmitLeave: false,
    canManageRecruitment: false, canViewRecruitment: true,
    canManagePerformanceCycles: false, canViewAllPerformance: true,
    canViewTeamPerformance: true, canSubmitOwnKPI: false, canScoreKPIs: false,
    canManageOnboarding: false, canViewOwnOnboarding: false,
    canManageOffboarding: false,
    canManageSettings: false,
    canViewAnalytics: true, canViewTeamAnalytics: true,
    isReadOnly: true,
  },
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function getCapabilities(role: string): RoleCapabilities {
  return ROLE_CAPABILITIES[role as SystemRole] ?? ROLE_CAPABILITIES.STAFF
}

export function getNavForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter(item => item.roles.includes(role as SystemRole))
}

export function canAccessRoute(role: string, pathname: string): boolean {
  for (const [prefix, roles] of Object.entries(ROUTE_ROLES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return roles.includes(role as SystemRole)
    }
  }
  return true // unregistered routes are open
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    HR_ADMIN: "HR Admin",
    MANAGER: "Manager",
    DEPARTMENT_LEAD: "Dept Lead",
    PROJECT_MANAGER: "Project Manager",
    STAFF: "Staff",
    INTERN: "Intern",
    TA_OFFICER: "TA Officer",
    PERFORMANCE_OFFICER: "Performance Officer",
    AUDIT: "Auditor",
  }
  return labels[role] ?? role
}
