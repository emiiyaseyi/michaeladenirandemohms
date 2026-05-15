"use client"
import { usePathname, useRouter } from "next/navigation"

const TABS = [
  { label: "Admins",             href: "/admin/settings/admins" },
  { label: "Departments",        href: "/admin/settings/departments" },
  { label: "Leave Types",        href: "/admin/settings/leave-types" },
  { label: "Public Holidays",    href: "/admin/settings/public-holidays" },
  { label: "Approval Workflows", href: "/admin/settings/approval-workflows" },
  { label: "Customization",      href: "/admin/settings/customization" },
  { label: "Intern Reports",     href: "/admin/settings/intern-reports" },
]

export default function SettingsNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Roles & Permissions is a standalone page — no tab bar
  if (pathname.startsWith("/admin/settings/roles-permissions")) return null

  return (
    <div>
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
    </div>
  )
}
