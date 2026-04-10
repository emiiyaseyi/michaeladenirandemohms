"use client"
import Card from "@/components/ui/Card"
import { Megaphone, Pin, ChevronRight, Bell } from "lucide-react"

const SAMPLE = [
  { id: 1, title: "Q2 Town Hall Meeting", date: "2026-04-10", category: "Event", pinned: true, body: "All staff are invited to the Q2 Town Hall on Friday April 10th at 2PM WAT via Google Meet. Agenda includes OKR review, HR updates, and Q&A." },
  { id: 2, title: "Public Holiday — Easter Break", date: "2026-04-18", category: "Holiday", pinned: true, body: "A reminder that the office will be closed from Friday April 18th through Monday April 21st for the Easter public holidays. Enjoy the break!" },
  { id: 3, title: "Updated Leave Policy — Effective May 1", date: "2026-04-08", category: "Policy", pinned: false, body: "The updated leave management policy takes effect from May 1, 2026. Key changes include maternity leave extension and a new caregiver leave type. Full policy available on the Documents portal." },
  { id: 4, title: "Benefits Enrollment Open Until April 30", date: "2026-04-05", category: "HR", pinned: false, body: "The annual benefits enrollment window is open. Log into the HR portal to review and update your health, pension, and welfare selections before April 30." },
]

const CAT_COLOR: Record<string, string> = { Event: "#6366F1", Holiday: "#F59E0B", Policy: "#EF4444", HR: "var(--primary)" }

export default function AnnouncementsPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Announcements</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Company-wide notices, policy updates, and important events</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {SAMPLE.map(ann => (
          <Card key={ann.id}>
            <div style={{ padding: "18px 20px", display: "flex", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${CAT_COLOR[ann.category] ?? "var(--primary)"}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Megaphone size={20} style={{ color: CAT_COLOR[ann.category] ?? "var(--primary)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{ann.title}</div>
                  {ann.pinned && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20, background: "var(--warning-bg)", color: "var(--warning)" }}>
                      <Pin size={9} /> Pinned
                    </span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${CAT_COLOR[ann.category]}15`, color: CAT_COLOR[ann.category] ?? "var(--primary)" }}>{ann.category}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>{new Date(ann.date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</div>
                <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.6 }}>{ann.body}</div>
              </div>
            </div>
          </Card>
        ))}

        <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
          <Bell size={20} style={{ marginBottom: 6, opacity: 0.4 }} />
          <div style={{ fontSize: 13 }}>More announcements will appear here when published by HR or an Admin.</div>
        </div>
      </div>
    </div>
  )
}
