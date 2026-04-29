"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import { Cake, Gift, CalendarOff, Star } from "lucide-react"

const TABS = [
  { key: "birthday",    label: "Birthdays",    icon: Cake,        color: "#EC4899" },
  { key: "anniversary", label: "Anniversaries", icon: Gift,        color: "#F59E0B" },
  { key: "onLeave",     label: "On Leave",      icon: CalendarOff, color: "#6366F1" },
] as const

type TabKey = typeof TABS[number]["key"]

function EmptyMsg({ message }: { message: string }) {
  return (
    <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted-foreground)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Star size={20} style={{ opacity: .5 }} />
      </div>
      <span style={{ fontSize: 13, textAlign: "center" }}>{message}</span>
    </div>
  )
}

export default function CelebrationsCard() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>("birthday")

  useEffect(() => {
    fetch("/api/celebrations")
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const birthdays     = events.filter(e => e.type === "birthday")
  const anniversaries = events.filter(e => e.type === "anniversary")
  const onLeave       = events.filter(e => e.type === "onLeave")

  const counts: Record<string, number> = {
    birthday:    birthdays.length,
    anniversary: anniversaries.length,
    onLeave:     onLeave.length,
  }

  const items  = tab === "birthday" ? birthdays : tab === "anniversary" ? anniversaries : onLeave
  const accent = TABS.find(t => t.key === tab)!.color

  return (
    <Card>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Upcoming Celebrations</span>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Next 60 days</div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 18px", overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "9px 12px 8px", fontSize: 12, fontWeight: 700,
            color: tab === t.key ? t.color : "var(--muted-foreground)",
            borderTop: "none", borderLeft: "none", borderRight: "none",
            borderBottom: tab === t.key ? `2px solid ${t.color}` : "2px solid transparent",
            background: "none", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap",
          }}>
            <t.icon size={12} />
            {t.label}
            {counts[t.key] > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, background: `${t.color}18`, color: t.color, borderRadius: 999, padding: "1px 6px" }}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyMsg message={
          tab === "birthday"    ? "No upcoming birthdays in the next 60 days" :
          tab === "anniversary" ? "No upcoming anniversaries in the next 60 days" :
          "No one is currently on leave"
        } />
      ) : (
        <div>
          {items.slice(0, 6).map((ev: any, i: number) => {
            const isLeave = tab === "onLeave"
            const daysUntil = isLeave ? null : Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86400000)
            const label = isLeave ? "On Leave" : daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 18px",
                borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <Avatar name={ev.name} photo={ev.profilePhoto} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {ev.jobTitle ?? "—"}{ev.years ? ` · ${ev.years}yr` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: accent, background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
