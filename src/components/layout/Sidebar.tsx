"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { ChevronRight, Leaf, LogOut } from "lucide-react"
import { getNavForRole, roleLabel, type NavItem } from "@/lib/rbac"

export default function Sidebar({ user, extraNav = [] }: { user: any; extraNav?: NavItem[] }) {
  const path = usePathname()
  const baseNav = getNavForRole(user?.role ?? "STAFF")

  // Merge extra nav items (e.g. Onboarding/Offboarding for staff triggered by admin)
  // Insert them before "Org Chart" if not already present
  const nav = [...baseNav]
  for (const item of extraNav) {
    if (!nav.find(n => n.href === item.href)) {
      const orgChartIdx = nav.findIndex(n => n.href === "/org-chart")
      if (orgChartIdx >= 0) nav.splice(orgChartIdx, 0, item)
      else nav.push(item)
    }
  }

  return (
    <aside style={{
      background: "var(--sidebar-bg)", width: 240, minHeight: "100vh",
      display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 50,
      borderRight: "1px solid var(--sidebar-border)",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--sidebar-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: "0 0 0 4px rgba(11,92,46,0.25)",
          }}>
            <Leaf size={18} color="white" />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>DSN HRMS</div>
            <div style={{ color: "var(--sidebar-fg)", fontSize: 11 }}>Data Science Nigeria</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--sidebar-fg)", padding: "4px 10px 8px", textTransform: "uppercase" }}>
          Main Menu
        </div>
        {nav.map(({ label, href, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/")
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
              borderRadius: 8, marginBottom: 2, textDecoration: "none",
              background: active ? "var(--sidebar-active)" : "transparent",
              color: active ? "var(--sidebar-fg-active)" : "var(--sidebar-fg)",
              fontWeight: active ? 600 : 400, fontSize: 13,
              transition: "all 0.15s ease",
              borderLeft: active ? "3px solid var(--primary-hover)" : "3px solid transparent",
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)" }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={13} strokeWidth={2.5} />}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: "10px", borderTop: "1px solid var(--sidebar-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0,
            letterSpacing: "0.05em",
          }}>
            {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "white", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name ?? "User"}
            </div>
            <div style={{ color: "var(--sidebar-fg)", fontSize: 10 }}>
              {roleLabel(user?.role ?? "")}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 8, background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer",
            color: "#F87171", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.18)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.08)" }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
