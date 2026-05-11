"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  ChevronRight, LogOut, ChevronDown,
  LayoutDashboard, UserCircle, Users, CalendarDays, Briefcase, TrendingUp,
  UserCheck, UserMinus, GitBranch, BarChart3, Settings, FolderOpen, Layers,
  Megaphone, HelpCircle, BarChart2, Receipt, Building2, Trash2, FileCheck,
  ClipboardList, DollarSign, Gift, Clock, Scale, Package, FileText,
  Calendar, ShoppingBag, MessageSquare, House, Banknote,
  type LucideIcon,
} from "lucide-react"
import { roleLabel, type NavItem } from "@/lib/rbac"

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, UserCircle, Users, CalendarDays, Briefcase, TrendingUp,
  UserCheck, UserMinus, GitBranch, BarChart3, Settings, FolderOpen, Layers,
  Megaphone, HelpCircle, BarChart2, Receipt, Building2, Trash2, FileCheck,
  ClipboardList, DollarSign, Gift, Clock, Scale, Package, FileText,
  Calendar, ShoppingBag, MessageSquare, House, Banknote,
}

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? HelpCircle
}

const closeMobileNav = () => document.body.classList.remove("mobile-nav-open")

function NavLink({ href, icon: Icon, label, active, indent = false }: {
  href: string; icon?: LucideIcon; label: string; active: boolean; indent?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={closeMobileNav}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: indent ? "6px 10px 6px 24px" : "9px 10px",
        borderRadius: 8, marginBottom: 1, textDecoration: "none",
        background: active ? "var(--sidebar-active)" : "transparent",
        color: active ? "var(--sidebar-fg-active)" : "var(--sidebar-fg)",
        fontWeight: active ? 600 : 400, fontSize: indent ? 12 : 13,
        transition: "all 0.15s ease",
        borderLeft: active ? "3px solid var(--primary-hover)" : "3px solid transparent",
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)" }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      {Icon && <Icon size={indent ? 14 : 16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />}
      {!Icon && indent && (
        <span style={{ width: 4, height: 4, borderRadius: "50%", background: active ? "var(--sidebar-fg-active)" : "var(--sidebar-fg)", flexShrink: 0, marginLeft: 4 }} />
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {active && !indent && <ChevronRight size={13} strokeWidth={2.5} />}
    </Link>
  )
}

export default function Sidebar({ user, nav: baseNav, homeUrl = "/", extraNav = [] }: {
  user: any; nav: NavItem[]; homeUrl?: string; extraNav?: NavItem[]
}) {
  const path = usePathname()

  const nav = [...baseNav]
  for (const item of extraNav) {
    if (!nav.find(n => (n.href ?? n.label) === (item.href ?? item.label))) {
      nav.push(item)
    }
  }

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const item of nav) {
      if (item.children?.some(c => path === c.href || path.startsWith(c.href + "/"))) {
        init[item.label] = true
      }
    }
    return init
  })

  useEffect(() => {
    nav.forEach(item => {
      if (item.children?.some(c => path === c.href || path.startsWith(c.href + "/"))) {
        setOpenDropdowns(prev => ({ ...prev, [item.label]: true }))
      }
    })
  }, [path])

  const toggle = (label: string) =>
    setOpenDropdowns(prev => ({ ...prev, [label]: !prev[label] }))

  return (
    <aside
      className="sidebar-shell"
      style={{
        background: "var(--sidebar-bg)",
        width: 240,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 50,
        borderRight: "1px solid var(--sidebar-border)",
        overflow: "hidden",
        transition: "transform 0.25s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* Logo */}
      <div style={{
        padding: "18px 20px 14px",
        borderBottom: "1px solid var(--sidebar-border)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, padding: 4, overflow: "hidden",
        }}>
          <img src="/dsn-logo.svg" alt="DSN" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div>
          <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>DSN HRMS</div>
          <div style={{ color: "var(--sidebar-fg)", fontSize: 11 }}>Data Science Nigeria</div>
        </div>
      </div>

      {/* Scrollable Nav */}
      <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto", overflowX: "hidden" }}>
        {(() => {
          const seenSections = new Set<string>()
          return nav.map(item => {
            const showSection = !!(item.section && !seenSections.has(item.section))
            if (item.section) seenSections.add(item.section)
            return { item, showSection }
          })
        })().map(({ item, showSection }) => {
          const shouldShowSection = showSection && user?.role !== "STAFF"
          const Icon = resolveIcon(item.icon)

          if (item.spacer) {
            return (
              <div
                key={item.label}
                style={{ height: 6, margin: "6px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}
              />
            )
          }

          if (item.children) {
            const isOpen   = openDropdowns[item.label] ?? false
            const isActive = item.children.some(c => path === c.href || path.startsWith(c.href + "/"))
            const role     = user?.role as string | undefined
            const visible  = item.children.filter(c => !c.excludeRoles?.includes(role as any))

            return (
              <div key={item.label}>
                {shouldShowSection && (
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--sidebar-fg)", padding: "10px 10px 4px", textTransform: "uppercase", marginTop: 4 }}>
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => toggle(item.label)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px", borderRadius: 8, marginBottom: 1,
                    background: isActive ? "var(--sidebar-active)" : "transparent",
                    color: isActive ? "var(--sidebar-fg-active)" : "var(--sidebar-fg)",
                    fontWeight: isActive ? 600 : 400, fontSize: 13,
                    border: "none", cursor: "pointer",
                    borderLeft: isActive ? "3px solid var(--primary-hover)" : "3px solid transparent",
                    transition: "all 0.15s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)" }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <ChevronDown size={13} style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }} />
                </button>

                {isOpen && (
                  <div style={{ marginBottom: 4 }}>
                    {visible.map(child => {
                      const childActive = path === child.href || (!child.exact && path.startsWith(child.href + "/"))
                      return (
                        <NavLink key={child.href} href={child.href} label={child.label} active={childActive} indent />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const active = item.href
            ? (path === item.href || (item.href !== homeUrl && path.startsWith(item.href + "/")))
            : false

          return (
            <div key={item.href ?? item.label}>
              {showSection && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--sidebar-fg)", padding: "10px 10px 4px", textTransform: "uppercase", marginTop: 4 }}>
                  {item.section}
                </div>
              )}
              <NavLink href={item.href!} icon={Icon} label={item.label} active={active} />
            </div>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: "10px", borderTop: "1px solid var(--sidebar-border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0,
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
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "white", padding: 4, display: "flex", alignItems: "center",
              borderRadius: 6, flexShrink: 0, transition: "background 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none" }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
