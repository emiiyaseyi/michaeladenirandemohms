"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import { Megaphone, Loader2 } from "lucide-react"

interface Announcement {
  id: string
  title: string
  body?: string | null
  behavior: string
}

interface Props {
  style?: React.CSSProperties
}

export default function AnnouncementsCard({ style }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/announcements")
      .then(r => r.json())
      .then(d => {
        const all: Announcement[] = d.announcements ?? []
        const filtered = all.filter(
          a => a.behavior !== "EMAIL_ONLY" && a.behavior !== "DASHBOARD_SCROLL"
        )
        setAnnouncements(filtered)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <Card style={style}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Announcements</span>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Recent notifications &amp; popups</div>
      </div>

      {loading ? (
        <div style={{ padding: "32px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13 }}>
          <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} />
          Loading…
        </div>
      ) : announcements.length === 0 ? (
        <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted-foreground)" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Megaphone size={20} style={{ opacity: 0.5 }} />
          </div>
          <span style={{ fontSize: 13, textAlign: "center" }}>No recent announcements</span>
        </div>
      ) : (
        <div>
          {announcements.map((ann, i) => (
            <div key={ann.id} style={{
              padding: "12px 18px",
              borderBottom: i < announcements.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-50, #EBF3FF)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <Megaphone size={14} style={{ color: "var(--primary)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ann.title}</div>
                  {ann.body && (
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ann.body}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Card>
  )
}
