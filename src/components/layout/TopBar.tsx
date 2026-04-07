"use client"
import { Bell, Search, Sun, Moon, Monitor } from "lucide-react"
import { useState } from "react"
import { useTheme } from "@/components/ThemeProvider"

export default function TopBar({ title, user }: { title: string; user: any }) {
  const [search, setSearch] = useState("")
  const { theme, setTheme, resolved } = useTheme()
  const [themeOpen, setThemeOpen] = useState(false)

  const themeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark"  as const, label: "Dark",  icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ]

  const cycleTheme = () => {
    const next: Record<string, "light" | "dark" | "system"> = { light: "dark", dark: "system", system: "light" }
    setTheme(next[theme] ?? "system")
  }

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor

  return (
    <header style={{
      height: 60, background: "var(--card)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", paddingInline: 24, gap: 12,
      position: "sticky", top: 0, zIndex: 40,
      backdropFilter: "blur(12px)",
      transition: "background var(--transition), border-color var(--transition)",
    }}>
      <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", flex: 1, margin: 0 }}>{title}</h1>

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "6px 12px", border: "1px solid var(--border)" }}>
        <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--foreground)", width: 160, outline: "none" }}
        />
        <span style={{ fontSize: 11, color: "var(--subtle)", background: "var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "monospace" }}>⌘K</span>
      </div>

      {/* Theme toggle */}
      <div style={{ position: "relative" }}>
        <button
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          style={{
            background: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer",
            borderRadius: 8, padding: 8, color: "var(--muted-foreground)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all var(--transition)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; (e.currentTarget as HTMLElement).style.background = "var(--primary-50)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
        >
          <ThemeIcon size={16} />
        </button>
      </div>

      {/* Notifications */}
      <button style={{
        position: "relative", background: "var(--muted)", border: "1px solid var(--border)",
        cursor: "pointer", borderRadius: 8, padding: 8, color: "var(--muted-foreground)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all var(--transition)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; (e.currentTarget as HTMLElement).style.background = "var(--primary-50)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
      >
        <Bell size={16} />
        <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--card)" }} />
      </button>

      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: "var(--primary)", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white",
        cursor: "pointer", flexShrink: 0,
        boxShadow: "0 0 0 2px var(--primary-50)",
      }}>
        {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2) ?? "U"}
      </div>
    </header>
  )
}
