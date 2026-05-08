"use client"
import {
  Bell, Search, Sun, Moon, Users, CalendarDays, Briefcase,
  LayoutDashboard, Building2, X, CheckCheck, Info, AlertTriangle,
  CheckCircle, XCircle, ChevronDown,
  LogOut, UserCircle, Menu, MoreVertical,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/ThemeProvider"
import { signOut } from "next-auth/react"
import { roleLabel } from "@/lib/rbac"

type Notification = {
  id: string
  title: string
  message: string
  type: "INFO" | "SUCCESS" | "WARNING" | "DANGER"
  isRead: boolean
  link: string | null
  createdAt: string
}

const NOTIF_ICON: Record<string, any> = { INFO: Info, SUCCESS: CheckCircle, WARNING: AlertTriangle, DANGER: XCircle }
const NOTIF_COLOR: Record<string, string> = { INFO: "#0369A1", SUCCESS: "#0B5C2E", WARNING: "#92600A", DANGER: "#DC2626" }
const NOTIF_BG: Record<string, string> = { INFO: "#EFF6FF", SUCCESS: "#F0FDF4", WARNING: "#FFFBEB", DANGER: "#FEF2F2" }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TYPE_ICON: Record<string, any> = {
  employee:   Users,
  leave:      CalendarDays,
  job:        Briefcase,
  department: Building2,
  nav:        LayoutDashboard,
}

const TYPE_LABEL: Record<string, string> = {
  employee:   "People",
  leave:      "Leave",
  job:        "Jobs",
  department: "Departments",
  nav:        "Features",
}

const TYPE_COLOR: Record<string, string> = {
  employee:   "#0B5C2E",
  leave:      "#92600A",
  job:        "#0369A1",
  department: "#6D28D9",
  nav:        "#374151",
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}


export default function TopBar({ title, user }: { title: string; user: any }) {
  const { theme, toggle: cycleTheme } = useTheme()
  const router = useRouter()

  const [query, setQuery]         = useState("")
  const [results, setResults]     = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [open, setOpen]           = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [notifOpen, setNotifOpen]         = useState(false)

  const [userOpen, setUserOpen]   = useState(false)
  const userRef                   = useRef<HTMLDivElement>(null)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const activeRole: string = user?.role ?? "STAFF"
  const hasElevatedRole = ["ADMIN", "PROJECT_LEAD"].includes(activeRole)

  const roleBase = activeRole === "ADMIN" ? "/admin" : activeRole === "PROJECT_LEAD" ? "/project-lead" : "/staff"
  const profileHref = activeRole === "SUPER_ADMIN" ? "/admin/preferences" : `${roleBase}/self-service/profile`

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(d => { setNotifications(d.notifications ?? []); setUnreadCount(d.unreadCount ?? 0) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!userRef.current?.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const markRead = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const handleNotifClick = (n: Notification) => {
    if (!n.isRead) markRead(n.id)
    if (n.link) { setNotifOpen(false); router.push(n.link) }
  }

  const inputRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQ   = useDebounce(query, 220)

  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`)
      .then(r => r.json())
      .then(d => { setResults(d.results ?? []); setOpen(true); setActiveIdx(-1) })
      .finally(() => setLoading(false))
  }, [debouncedQ])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const navigate = useCallback((href: string) => {
    setOpen(false); setQuery(""); setResults([])
    router.push(href)
  }, [router])

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || !results.length) return
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); navigate(results[activeIdx].href) }
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur() }
  }

  const ThemeIcon = theme === "dark" ? Moon : Sun

  const grouped = results.reduce<Record<string, any[]>>((acc, r, i) => {
    const g = r.type
    if (!acc[g]) acc[g] = []
    acc[g].push({ ...r, _idx: i })
    return acc
  }, {})

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U"

  const BellBadge = ({ size = 16 }: { size?: number }) => (
    <button
      onClick={() => setNotifOpen(o => !o)}
      style={{
        position: "relative",
        background: notifOpen ? "var(--primary-50)" : "var(--muted)",
        border: `1px solid ${notifOpen ? "var(--primary)" : "var(--border)"}`,
        cursor: "pointer", borderRadius: 8, padding: 8,
        color: notifOpen ? "var(--primary)" : "var(--muted-foreground)",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!notifOpen) { const el = e.currentTarget as HTMLElement; el.style.color = "var(--primary)"; el.style.background = "var(--primary-50)" } }}
      onMouseLeave={e => { if (!notifOpen) { const el = e.currentTarget as HTMLElement; el.style.color = "var(--muted-foreground)"; el.style.background = "var(--muted)" } }}
    >
      <Bell size={size} />
      {unreadCount > 0 && (
        <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, padding: "0 4px", background: "var(--accent)", border: "2px solid var(--card)", fontSize: 9, fontWeight: 800, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  )

  return (
    <header style={{
      height: 60, background: "var(--card)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", paddingInline: 16, gap: 10,
    }}>
      {/* Hamburger — mobile only */}
      <button
        className="hdr-mobile"
        onClick={() => document.body.classList.toggle("mobile-nav-open")}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--foreground)", padding: 6, borderRadius: 6,
          display: "flex", alignItems: "center", flexShrink: 0,
        }}
      >
        <Menu size={22} />
      </button>

      {/* Page title */}
      <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", flex: 1, margin: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {title}
      </h1>

      {/* ── Desktop controls ── */}
      <div className="hdr-desktop" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {/* Global Search */}
        <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: open ? "var(--card)" : "var(--muted)",
            borderRadius: open ? "10px 10px 0 0" : 10,
            padding: "7px 12px",
            border: `1.5px solid ${open ? "var(--primary)" : "var(--border)"}`,
            boxShadow: open ? "0 0 0 3px var(--ring)" : "none",
            transition: "all 0.15s",
            width: open ? 340 : 240,
          }}>
            {loading
              ? <div style={{ width: 14, height: 14, border: "2px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
              : <Search size={14} style={{ color: open ? "var(--primary)" : "var(--muted-foreground)", flexShrink: 0, transition: "color 0.15s" }} />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => { if (results.length) setOpen(true) }}
              onKeyDown={handleKey}
              placeholder="Search people, leave, jobs, features…"
              autoComplete="off"
              style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--foreground)", flex: 1, outline: "none", minWidth: 0 }}
            />
            {query
              ? <button onClick={() => { setQuery(""); setResults([]); setOpen(false) }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--subtle)", padding: 0, display: "flex", lineHeight: 1 }}><X size={13} /></button>
              : <kbd style={{ fontSize: 10, color: "var(--subtle)", background: "var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "monospace", lineHeight: 1.6, flexShrink: 0 }}>⌘K</kbd>
            }
          </div>

          {open && results.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              background: "var(--card)", border: "1.5px solid var(--primary)",
              borderTop: "1px solid var(--border)", borderRadius: "0 0 12px 12px",
              boxShadow: "var(--shadow-lg)", overflow: "hidden", zIndex: 100,
              maxHeight: 440, overflowY: "auto",
            }}>
              {Object.entries(grouped).map(([type, items]) => {
                const Icon = TYPE_ICON[type] ?? LayoutDashboard
                return (
                  <div key={type}>
                    <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 800, letterSpacing: "0.09em", color: "var(--subtle)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5, borderTop: "1px solid var(--border)" }}>
                      <Icon size={10} />{TYPE_LABEL[type] ?? type}
                    </div>
                    {items.map(item => {
                      const isActive = item._idx === activeIdx
                      return (
                        <div key={`${type}-${item._idx}`} onMouseEnter={() => setActiveIdx(item._idx)} onMouseLeave={() => setActiveIdx(-1)} onClick={() => navigate(item.href)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", background: isActive ? "var(--muted)" : "transparent", transition: "background 0.1s" }}>
                          {item.initials ? (
                            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: TYPE_COLOR[type] ?? "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white", letterSpacing: "0.04em" }}>{item.initials}</div>
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: `${TYPE_COLOR[type] ?? "#374151"}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon size={13} style={{ color: TYPE_COLOR[type] ?? "var(--muted-foreground)" }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.desc}</div>
                          </div>
                          {item.meta && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0, background: ["APPROVED","ACTIVE","OPEN"].includes(item.meta) ? "var(--success-bg)" : "var(--muted)", color: ["APPROVED","ACTIVE","OPEN"].includes(item.meta) ? "var(--success)" : "var(--muted-foreground)", textTransform: "uppercase" }}>{item.meta}</span>
                          )}
                          {isActive && <kbd style={{ fontSize: 10, color: "var(--subtle)", background: "var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "monospace", flexShrink: 0 }}>↵</kbd>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 16 }}>
                {[["↑↓", "navigate"], ["↵", "open"], ["esc", "close"]].map(([key, label]) => (
                  <span key={key} style={{ fontSize: 11, color: "var(--subtle)", display: "flex", alignItems: "center", gap: 4 }}>
                    <kbd style={{ background: "var(--border)", borderRadius: 3, padding: "1px 4px", fontFamily: "monospace", fontSize: 10 }}>{key}</kbd>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {open && query && results.length === 0 && !loading && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1.5px solid var(--primary)", borderTop: "1px solid var(--border)", borderRadius: "0 0 12px 12px", boxShadow: "var(--shadow-lg)", padding: "24px 14px", textAlign: "center", zIndex: 100 }}>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><Search size={28} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} /></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>No results for "{query}"</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Try a name, job title, leave type, or feature</div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={cycleTheme} title={`Switch theme (${theme})`}
          style={{ background: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer", borderRadius: 8, padding: 8, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--primary)"; el.style.background = "var(--primary-50)" }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--muted-foreground)"; el.style.background = "var(--muted)" }}
        >
          <ThemeIcon size={16} />
        </button>

        {/* Notifications bell — desktop */}
        <BellBadge size={16} />

        {/* User dropdown */}
        <div ref={userRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setUserOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 5px",
              background: userOpen ? "var(--muted)" : "transparent",
              border: `1px solid ${userOpen ? "var(--border)" : "transparent"}`,
              borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)" }}
            onMouseLeave={e => { if (!userOpen) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent" } }}
          >
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white" }}>
              {initials}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.2 }}>{user?.name ?? "User"}</div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{roleLabel(user?.role ?? "")}</div>
            </div>
            <ChevronDown size={13} style={{ color: "var(--muted-foreground)", transform: userOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>

          {userOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 240, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden", zIndex: 200 }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white", flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name ?? "User"}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email ?? ""}</div>
                </div>
              </div>
              <div style={{ padding: "6px 0" }}>
                {[
                  { label: activeRole === "SUPER_ADMIN" ? "Preferences" : "My Profile", href: profileHref, icon: UserCircle, show: true },
                ].filter(i => i.show).map(item => {
                  const Icon = item.icon
                  return (
                    <button key={item.href}
                      onClick={() => { setUserOpen(false); router.push(item.href) }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                    >
                      <Icon size={15} style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ fontSize: 13, color: "var(--foreground)" }}>{item.label}</span>
                    </button>
                  )
                })}
              </div>
              {user?.lastLoginAt && (
                <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted-foreground)" }}>
                  Last Login: {new Date(user.lastLoginAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(user.lastLoginAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
              )}
              <div style={{ padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--danger-bg)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                >
                  <LogOut size={15} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile controls ── */}
      <div className="hdr-mobile" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <BellBadge size={16} />
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          style={{
            background: mobileMenuOpen ? "var(--primary-50)" : "var(--muted)",
            border: `1px solid ${mobileMenuOpen ? "var(--primary)" : "var(--border)"}`,
            cursor: "pointer", borderRadius: 8, padding: 8,
            color: mobileMenuOpen ? "var(--primary)" : "var(--muted-foreground)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* ── Notification panel (fixed — works on both mobile and desktop) ── */}
      {notifOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 190 }} onClick={() => setNotifOpen(false)} />
          <div style={{
            position: "fixed", top: 60, right: 0,
            width: "min(360px, 100vw)", maxHeight: "calc(100vh - 60px)",
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "0 0 0 12px", boxShadow: "var(--shadow-lg)",
            display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 200,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>
                Notifications
                {unreadCount > 0 && <span style={{ marginLeft: 8, background: "var(--primary)", color: "white", fontSize: 10, fontWeight: 800, borderRadius: 10, padding: "1px 7px" }}>{unreadCount}</span>}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6 }}>
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <Bell size={28} style={{ color: "var(--muted-foreground)", marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>All caught up</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>No notifications yet</div>
                </div>
              ) : notifications.map(n => {
                const Icon = NOTIF_ICON[n.type] ?? Info
                return (
                  <div key={n.id} onClick={() => handleNotifClick(n)}
                    style={{ display: "flex", gap: 12, padding: "12px 16px", background: n.isRead ? "transparent" : "var(--primary-50)", borderBottom: "1px solid var(--border)", cursor: n.link ? "pointer" : "default", transition: "background 0.1s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.isRead ? "transparent" : "var(--primary-50)" }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: NOTIF_BG[n.type] ?? "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={15} style={{ color: NOTIF_COLOR[n.type] ?? "#0369A1" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: "var(--foreground)", marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", flexShrink: 0, marginTop: 4 }} />}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Mobile ⋮ menu ── */}
      {mobileMenuOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 290 }} onClick={() => setMobileMenuOpen(false)} />
          <div style={{
            position: "fixed", top: 60, right: 0,
            width: "min(300px, 100vw)", background: "var(--card)",
            border: "1px solid var(--border)", borderRadius: "0 0 0 12px",
            boxShadow: "var(--shadow-lg)", overflow: "hidden", zIndex: 300,
          }}>
            {/* Search */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "8px 12px", border: "1.5px solid var(--border)" }}>
                <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Search…"
                  autoComplete="off"
                  style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--foreground)", flex: 1, outline: "none" }}
                />
                {query && <button onClick={() => { setQuery(""); setResults([]); setOpen(false) }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--subtle)", padding: 0, display: "flex" }}><X size={12} /></button>}
              </div>
              {open && results.length > 0 && (
                <div style={{ marginTop: 6, maxHeight: 180, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                  {results.slice(0, 5).map((item, i) => (
                    <div key={i}
                      onClick={() => { navigate(item.href); setMobileMenuOpen(false) }}
                      style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)", fontSize: 13 }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <div style={{ fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Theme */}
            <button
              onClick={() => { cycleTheme(); setMobileMenuOpen(false) }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <ThemeIcon size={15} style={{ color: "var(--muted-foreground)" }} />
              <span style={{ fontSize: 13, color: "var(--foreground)" }}>
                {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </span>
            </button>

            {/* User info */}
            <div style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name ?? "User"}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{roleLabel(user?.role ?? "")}</div>
              </div>
            </div>

            {/* Profile */}
            <button
              onClick={() => { setMobileMenuOpen(false); router.push(profileHref) }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <UserCircle size={15} style={{ color: "var(--muted-foreground)" }} />
              <span style={{ fontSize: 13, color: "var(--foreground)" }}>My Profile</span>
            </button>

            {/* Logout */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--danger-bg)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <LogOut size={15} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>Log Out</span>
            </button>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </header>
  )
}
