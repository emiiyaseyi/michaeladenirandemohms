"use client"
import { Bell, Search, Sun, Moon, Monitor, Users, CalendarDays, Briefcase, LayoutDashboard, Building2, X } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/ThemeProvider"

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
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const [query, setQuery]         = useState("")
  const [results, setResults]     = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [open, setOpen]           = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const inputRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQ   = useDebounce(query, 220)

  // Fetch results
  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`)
      .then(r => r.json())
      .then(d => { setResults(d.results ?? []); setOpen(true); setActiveIdx(-1) })
      .finally(() => setLoading(false))
  }, [debouncedQ])

  // ⌘K / Ctrl+K global shortcut
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

  // Click outside to close
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

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor
  const cycleTheme = () => {
    const next: Record<string, "light" | "dark" | "system"> = { light: "dark", dark: "system", system: "light" }
    setTheme(next[theme] ?? "light")
  }

  // Group results by type
  const grouped = results.reduce<Record<string, any[]>>((acc, r, i) => {
    const g = r.type
    if (!acc[g]) acc[g] = []
    acc[g].push({ ...r, _idx: i })
    return acc
  }, {})

  return (
    <header style={{
      height: 60, background: "var(--card)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", paddingInline: 24, gap: 12,
      position: "sticky", top: 0, zIndex: 40,
    }}>
      <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", flex: 1, margin: 0 }}>{title}</h1>

      {/* ── Global Search ── */}
      <div ref={containerRef} style={{ position: "relative" }}>
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
            style={{
              border: "none", background: "transparent", fontSize: 13,
              color: "var(--foreground)", flex: 1, outline: "none",
              minWidth: 0,
            }}
          />
          {query
            ? <button onClick={() => { setQuery(""); setResults([]); setOpen(false) }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--subtle)", padding: 0, display: "flex", lineHeight: 1 }}><X size={13} /></button>
            : <kbd style={{ fontSize: 10, color: "var(--subtle)", background: "var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "monospace", lineHeight: 1.6, flexShrink: 0 }}>⌘K</kbd>
          }
        </div>

        {/* Results dropdown */}
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
                  {/* Group header */}
                  <div style={{
                    padding: "8px 14px 4px",
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.09em",
                    color: "var(--subtle)", textTransform: "uppercase",
                    display: "flex", alignItems: "center", gap: 5,
                    borderTop: "1px solid var(--border)",
                  }}>
                    <Icon size={10} />
                    {TYPE_LABEL[type] ?? type}
                  </div>
                  {items.map(item => {
                    const isActive = item._idx === activeIdx
                    return (
                      <div
                        key={`${type}-${item._idx}`}
                        onMouseEnter={() => setActiveIdx(item._idx)}
                        onMouseLeave={() => setActiveIdx(-1)}
                        onClick={() => navigate(item.href)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 14px", cursor: "pointer",
                          background: isActive ? "var(--muted)" : "transparent",
                          transition: "background 0.1s",
                        }}
                      >
                        {/* Avatar / icon */}
                        {item.initials ? (
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                            background: TYPE_COLOR[type] ?? "var(--primary)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 800, color: "white", letterSpacing: "0.04em",
                          }}>{item.initials}</div>
                        ) : (
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            background: `${TYPE_COLOR[type] ?? "#374151"}18`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Icon size={13} style={{ color: TYPE_COLOR[type] ?? "var(--muted-foreground)" }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.desc}</div>
                        </div>
                        {item.meta && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0,
                            background: item.meta === "APPROVED" || item.meta === "ACTIVE" || item.meta === "OPEN" ? "var(--success-bg)" : "var(--muted)",
                            color: item.meta === "APPROVED" || item.meta === "ACTIVE" || item.meta === "OPEN" ? "var(--success)" : "var(--muted-foreground)",
                            textTransform: "uppercase",
                          }}>{item.meta}</span>
                        )}
                        {isActive && (
                          <kbd style={{ fontSize: 10, color: "var(--subtle)", background: "var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "monospace", flexShrink: 0 }}>↵</kbd>
                        )}
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
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            background: "var(--card)", border: "1.5px solid var(--primary)",
            borderTop: "1px solid var(--border)", borderRadius: "0 0 12px 12px",
            boxShadow: "var(--shadow-lg)", padding: "24px 14px",
            textAlign: "center", zIndex: 100,
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>🔍</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>No results for "{query}"</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Try a name, job title, leave type, or feature</div>
          </div>
        )}
      </div>

      {/* ── Theme toggle ── */}
      <button
        onClick={cycleTheme}
        title={`Switch theme (${theme})`}
        style={{
          background: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer",
          borderRadius: 8, padding: 8, color: "var(--muted-foreground)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s", flexShrink: 0,
        }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--primary)"; el.style.background = "var(--primary-50)" }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--muted-foreground)"; el.style.background = "var(--muted)" }}
      >
        <ThemeIcon size={16} />
      </button>

      {/* ── Notifications ── */}
      <button style={{
        position: "relative", background: "var(--muted)", border: "1px solid var(--border)",
        cursor: "pointer", borderRadius: 8, padding: 8, color: "var(--muted-foreground)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s", flexShrink: 0,
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--primary)"; el.style.background = "var(--primary-50)" }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--muted-foreground)"; el.style.background = "var(--muted)" }}
      >
        <Bell size={16} />
        <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--card)" }} />
      </button>

      {/* ── Avatar ── */}
      <div style={{
        width: 34, height: 34, borderRadius: "50%", background: "var(--primary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer", flexShrink: 0,
        boxShadow: "0 0 0 2px var(--primary-50)",
      }}>
        {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2) ?? "U"}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </header>
  )
}
