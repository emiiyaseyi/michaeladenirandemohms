"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  ChevronRight, Leaf, LogOut, ChevronDown,
  UserCircle, CalendarDays, ShoppingBag, MessageSquare,
  DoorOpen, ClipboardList, ChevronLeft, PanelLeftClose, PanelLeftOpen,
  Receipt,
} from "lucide-react"
import { getNavForRole, roleLabel, type NavItem } from "@/lib/rbac"

// ── Self Service sub-items ─────────────────────────────────────────────────────
const SS_SUBITEMS = [
  { label: "Profile",     href: "/self-service/profile",      icon: UserCircle },
  { label: "Leave",       href: "/self-service/leave",        icon: CalendarDays },
  { label: "Payslips",    href: "/self-service/payslips",     icon: Receipt },
  { label: "Requisition", href: "/self-service/requisitions", icon: ShoppingBag },
  { label: "Grievance",   href: "/self-service/grievance",    icon: MessageSquare },
  { label: "Exit",        href: "/self-service/exit",         icon: DoorOpen },
  { label: "Surveys",     href: "/self-service/surveys",      icon: ClipboardList },
]

const COLLAPSED_KEY = "dsn_sidebar_collapsed"

function NavLink({ href, icon: Icon, label, active, indent = false, collapsed = false }: {
  href: string; icon: any; label: string; active: boolean; indent?: boolean; collapsed?: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: collapsed ? 0 : 10,
        padding: indent ? "7px 10px 7px 28px" : "9px 10px",
        borderRadius: 8, marginBottom: 1, textDecoration: "none",
        background: active ? "var(--sidebar-active)" : "transparent",
        color: active ? "var(--sidebar-fg-active)" : "var(--sidebar-fg)",
        fontWeight: active ? 600 : 400, fontSize: indent ? 12 : 13,
        transition: "all 0.15s ease",
        borderLeft: active ? "3px solid var(--primary-hover)" : "3px solid transparent",
        justifyContent: collapsed ? "center" : "flex-start",
        position: "relative",
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)" }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      <Icon size={indent ? 14 : 16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && active && !indent && <ChevronRight size={13} strokeWidth={2.5} />}
    </Link>
  )
}

export default function Sidebar({ user, extraNav = [] }: { user: any; extraNav?: NavItem[] }) {
  const path = usePathname()
  const baseNav = getNavForRole(user?.role ?? "STAFF")
  const [ssOpen, setSsOpen] = useState(path.startsWith("/self-service"))

  // Auto-expand Self Service accordion when navigating into /self-service
  useEffect(() => {
    if (path.startsWith("/self-service")) setSsOpen(true)
  }, [path])
  const [collapsed, setCollapsed] = useState(false)

  // Persist collapse state
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(COLLAPSED_KEY) : null
    if (saved === "1") setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0")
      return next
    })
  }

  // Merge extra nav items before Org Chart
  const nav = [...baseNav]
  for (const item of extraNav) {
    if (!nav.find(n => n.href === item.href)) {
      const idx = nav.findIndex(n => n.href === "/org-chart")
      if (idx >= 0) nav.splice(idx, 0, item)
      else nav.push(item)
    }
  }

  const isSsActive = path.startsWith("/self-service")
  const ELEVATED = ["SUPER_ADMIN","ADMIN","HR_ADMIN","MANAGER","DEPARTMENT_LEAD","PROJECT_MANAGER","TEAM_LEAD","PROJECT_LEAD","RELIEF_OFFICER","PERFORMANCE_OFFICER","TA_OFFICER","PAYROLL_OFFICER","AUDIT"]
  const isElevated = ELEVATED.includes(user?.role ?? "")

  const sidebarWidth = collapsed ? 60 : 240

  return (
    <aside style={{
      background: "var(--sidebar-bg)",
      width: sidebarWidth,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 50,
      borderRight: "1px solid var(--sidebar-border)",
      overflow: "hidden",
      transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? "20px 0 16px" : "20px 20px 16px", borderBottom: "1px solid var(--sidebar-border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && (
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
        )}
        {collapsed && (
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 4px rgba(11,92,46,0.25)",
          }}>
            <Leaf size={18} color="white" />
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          position: "absolute", top: 14, right: collapsed ? 8 : -22,
          width: 44, height: 44, borderRadius: "50%",
          background: "var(--primary)", border: "3px solid var(--sidebar-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "white", zIndex: 60,
          transition: "right 0.22s cubic-bezier(.4,0,.2,1)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.55)",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.65)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.55)" }}
      >
        {collapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
      </button>

      {/* Scrollable Nav */}
      <nav style={{ flex: 1, padding: collapsed ? "12px 6px" : "12px 10px", overflowY: "auto", overflowX: "hidden" }}>

        {/* ── EMPLOYEE / SELF-SERVICE VIEW (elevated users on /self-service) ── */}
        {isSsActive && isElevated ? (
          <>
            {!collapsed && (
              <Link href="/dashboard" style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 8,
                borderRadius: 8, background: "rgba(255,255,255,0.06)", textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <ChevronRight size={13} style={{ color: "var(--sidebar-fg)", transform: "rotate(180deg)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sidebar-fg)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Back to Admin View</span>
              </Link>
            )}
            {collapsed && (
              <Link href="/dashboard" title="Back to Admin View" style={{ display: "flex", justifyContent: "center", padding: "9px 0", marginBottom: 8, borderRadius: 8, background: "rgba(255,255,255,0.06)" }}>
                <ChevronLeft size={16} style={{ color: "var(--sidebar-fg)" }} />
              </Link>
            )}
            {!collapsed && (
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--sidebar-fg)", padding: "4px 10px 8px", textTransform: "uppercase" }}>
                My Self Service
              </div>
            )}
            {SS_SUBITEMS.map(sub => {
              const subActive = path === sub.href || (sub.href !== "/self-service" && path.startsWith(sub.href))
              return <NavLink key={sub.href} href={sub.href} icon={sub.icon} label={sub.label} active={subActive} collapsed={collapsed} />
            })}
          </>
        ) : (
          <>
            {/* ── FULL ADMIN / ROLE-BASED NAV ── */}
            {!collapsed && (
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--sidebar-fg)", padding: "4px 10px 8px", textTransform: "uppercase" }}>
                Main Menu
              </div>
            )}
            {nav.map(({ label, href, icon: Icon, indent }) => {
              if (href === "/self-service") {
                return (
                  <div key={href}>
                    <Link
                      href="/self-service"
                      onClick={() => setSsOpen(o => !o)}
                      title={collapsed ? "Self Service" : undefined}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: collapsed ? 0 : 10,
                        padding: "9px 10px", borderRadius: 8, marginBottom: 1,
                        background: isSsActive ? "var(--sidebar-active)" : "transparent",
                        color: isSsActive ? "var(--sidebar-fg-active)" : "var(--sidebar-fg)",
                        fontWeight: isSsActive ? 600 : 400, fontSize: 13,
                        textDecoration: "none", cursor: "pointer",
                        borderLeft: isSsActive ? "3px solid var(--primary-hover)" : "3px solid transparent",
                        transition: "all 0.15s ease",
                        justifyContent: collapsed ? "center" : "flex-start",
                      }}
                      onMouseEnter={e => { if (!isSsActive) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)" }}
                      onMouseLeave={e => { if (!isSsActive) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                    >
                      <Icon size={16} strokeWidth={isSsActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                      {!collapsed && <span style={{ flex: 1 }}>Self Service</span>}
                      {!collapsed && <ChevronDown size={13} style={{ transform: ssOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }} />}
                    </Link>
                    {(ssOpen || collapsed) && (
                      <div style={{ marginBottom: 4 }}>
                        {SS_SUBITEMS.map(sub => {
                          const subActive = path === sub.href || (sub.href !== "/self-service" && path.startsWith(sub.href))
                          return <NavLink key={sub.href} href={sub.href} icon={sub.icon} label={sub.label} active={subActive} indent={!collapsed} collapsed={collapsed} />
                        })}
                      </div>
                    )}
                  </div>
                )
              }
              const active = path === href || (href !== "/" && path.startsWith(href + "/") && !nav.some(n => n.href !== href && n.href.startsWith(href) && (path === n.href || path.startsWith(n.href + "/"))))
              return <NavLink key={href} href={href} icon={Icon} label={label} active={active} indent={indent} collapsed={collapsed} />
            })}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: collapsed ? "10px 6px" : "10px", borderTop: "1px solid var(--sidebar-border)", flexShrink: 0 }}>
        {!collapsed && (
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
        )}
        {collapsed && (
          <div title={user?.name ?? "User"} style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: "white",
            }}>
              {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U"}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Sign Out" : undefined}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: collapsed ? 0 : 8,
            padding: "8px 10px", borderRadius: 8, background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer",
            color: "#F87171", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.18)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.08)" }}
        >
          <LogOut size={14} />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  )
}
