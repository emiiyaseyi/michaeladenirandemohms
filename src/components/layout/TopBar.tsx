"use client"
import { Bell, Search } from "lucide-react"
import { useState } from "react"

export default function TopBar({ title, user }: { title: string; user: any }) {
  const [search, setSearch] = useState("")
  return (
    <header style={{
      height: 60, background: "var(--card)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", paddingInline: 24, gap: 16,
      position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(8px)"
    }}>
      <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", flex: 1 }}>{title}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "6px 12px" }}>
        <Search size={14} style={{ color: "var(--muted-foreground)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--foreground)", width: 180, outline: "none" }} />
      </div>
      <button style={{ position: "relative", background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 8, padding: 8, color: "var(--muted-foreground)" }}>
        <Bell size={16} />
        <span style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
      </button>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer" }}>
        {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2) ?? "U"}
      </div>
    </header>
  )
}
