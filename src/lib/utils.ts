import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistance } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined, fmt = "MMM d, yyyy") {
  if (!date) return "—"
  return format(new Date(date), fmt)
}

export function timeAgo(date: Date | string) {
  return formatDistance(new Date(date), new Date(), { addSuffix: true })
}

export function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
}

export function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount)
}

export function statusColor(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: "var(--success-bg)", text: "var(--success)" },
    APPROVED: { bg: "var(--success-bg)", text: "var(--success)" },
    PENDING: { bg: "var(--warning-bg)", text: "var(--warning)" },
    REJECTED: { bg: "var(--danger-bg)", text: "var(--danger)" },
    CANCELLED: { bg: "var(--muted)", text: "var(--muted-foreground)" },
    TERMINATED: { bg: "var(--danger-bg)", text: "var(--danger)" },
    ON_LEAVE: { bg: "var(--info-bg)", text: "var(--info)" },
    DRAFT: { bg: "var(--muted)", text: "var(--muted-foreground)" },
    OPEN: { bg: "var(--success-bg)", text: "var(--success)" },
    CLOSED: { bg: "var(--muted)", text: "var(--muted-foreground)" },
    HIRED: { bg: "var(--success-bg)", text: "var(--success)" },
    IN_PROGRESS: { bg: "var(--info-bg)", text: "var(--info)" },
    COMPLETED: { bg: "var(--success-bg)", text: "var(--success)" },
    SUBMITTED: { bg: "var(--info-bg)", text: "var(--info)" },
    RESIGNED: { bg: "var(--danger-bg)", text: "var(--danger)" },
    SUSPENDED: { bg: "var(--warning-bg)", text: "var(--warning)" },
  }
  return map[status] ?? { bg: "var(--muted)", text: "var(--muted-foreground)" }
}

export function roleLabel(role: string) {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Super Admin", ADMIN: "Admin", HR_ADMIN: "HR Admin",
    MANAGER: "Manager", DEPARTMENT_LEAD: "Dept. Lead",
    PROJECT_MANAGER: "Project Manager", STAFF: "Staff", INTERN: "Intern",
    TA_OFFICER: "TA Officer", PERFORMANCE_OFFICER: "Perf. Officer", AUDIT: "Audit",
  }
  return map[role] ?? role
}

export function labelify(str: string) {
  return str.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
