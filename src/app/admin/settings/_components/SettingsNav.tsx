"use client"
import { usePathname, useRouter } from "next/navigation"

const TABS = [
  { label: "Admins",             href: "/admin/settings/admins" },
  { label: "Roles & Permissions", href: "/admin/settings/roles-permissions" },
  { label: "HR & Payroll",       href: "/admin/settings/hr-payroll" },
  { label: "Departments",        href: "/admin/settings/departments" },
  { label: "Leave Types",        href: "/admin/settings/leave-types" },
  { label: "Public Holidays",    href: "/admin/settings/public-holidays" },
  { label: "Approval Workflows", href: "/admin/settings/approval-workflows" },
  { label: "Customization",      href: "/admin/settings/customization" },
  { label: "Single Sign-On",     href: "/admin/settings/single-sign-on" },
]

const TITLES: Record<string, string> = {
  "/admin/settings/admins":             "Admins",
  "/admin/settings/hr-payroll":         "HR & Payroll",
  "/admin/settings/departments":        "Departments",
  "/admin/settings/leave-types":        "Leave Types",
  "/admin/settings/public-holidays":    "Public Holidays",
  "/admin/settings/approval-workflows": "Approval Workflows",
  "/admin/settings/customization":      "Customization",
  "/admin/settings/single-sign-on":     "Single Sign-On",
  "/admin/settings/roles-permissions":  "Roles & Permissions",
}

export default function SettingsNav() {
  const pathname = usePathname()
  const router = useRouter()

  const isRolesPage = pathname.startsWith("/admin/settings/roles-permissions")
  const title = Object.entries(TITLES).find(([k]) => pathname === k || pathname.startsWith(k + "/"))?.[1] ?? "Settings"

  return (
    <div>
      {!isRolesPage && (
        <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 0, overflowX: "auto" }}>
          {TABS.map(tab => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + "/")
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--primary)" : "var(--muted-foreground)",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? "var(--primary)" : "transparent"}`,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "color .15s",
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
