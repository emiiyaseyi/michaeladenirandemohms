"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Image from "next/image"
import {
  LayoutDashboard, Users, CalendarDays, Briefcase, TrendingUp,
  UserCheck, UserMinus, GitBranch, BarChart3, Settings, LogOut,
  ChevronRight, Bell, Building2
} from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Employees",    href: "/employees",    icon: Users },
  { label: "Leave",        href: "/leave",        icon: CalendarDays },
  { label: "Recruitment",  href: "/recruitment",  icon: Briefcase },
  { label: "Performance",  href: "/performance",  icon: TrendingUp },
  { label: "Onboarding",   href: "/onboarding",   icon: UserCheck },
  { label: "Offboarding",  href: "/offboarding",  icon: UserMinus },
  { label: "Org Chart",    href: "/org-chart",    icon: GitBranch },
  { label: "Analytics",    href: "/analytics",    icon: BarChart3 },
  { label: "Settings",     href: "/settings",     icon: Settings },
]

export default function Sidebar({ user }: { user: any }) {
  const path = usePathname()
  return (
    <aside style={{ background: "var(--sidebar-bg)", width: 240, minHeight: "100vh", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 50 }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Building2 size={18} color="white" />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>DSN HRMS</div>
            <div style={{ color: "var(--sidebar-fg)", fontSize: 11 }}>Data Science Nigeria</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "var(--sidebar-fg)", padding: "4px 10px 8px", textTransform: "uppercase" }}>Menu</div>
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
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)" }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0 }}>
            {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2) ?? "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "white", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name ?? "User"}</div>
            <div style={{ color: "var(--sidebar-fg)", fontSize: 11 }}>{user?.role?.replace(/_/g," ") ?? ""}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sidebar-fg)", padding: 4, borderRadius: 4 }} title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
