"use client"
import { useState, useEffect } from "react"
import { MessageSquare, Calendar } from "lucide-react"
import { format } from "date-fns"

const CONV_TYPES: Record<string, string> = {
  CHECK_IN: "Check-in", ONBOARDING: "Onboarding", CAREER: "Career",
  REALIGNMENT: "Re-alignment", OTHER: "Other",
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SCHEDULED: { bg: "#DBEAFE", color: "#1D4ED8" },
  COMPLETED:  { bg: "#DCFCE7", color: "#15803D" },
  CANCELLED:  { bg: "#FEE2E2", color: "#DC2626" },
  PENDING:    { bg: "#FEF3C7", color: "#D97706" },
}

export default function StaffConversationsPage() {
  const [rounds, setRounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const d = await fetch("/api/performance/conversations/rounds?mine=true").then(r => r.json())
      setRounds(d.rounds ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <MessageSquare size={22} style={{ color: "var(--primary)" }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>My Conversations</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Scheduled 1:1 conversations with your team lead</p>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["Scheduled Date", "Conversation With", "Type", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : rounds.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No conversations scheduled yet.</td></tr>
              ) : rounds.map(r => {
                const s = STATUS_COLORS[r.status] ?? STATUS_COLORS.PENDING
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Calendar size={13} style={{ color: "var(--muted-foreground)" }} />
                        {format(new Date(r.scheduledDate), "MMM d, yyyy")}
                        {r.setup?.startTime && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.setup.startTime}{r.setup.endTime ? ` – ${r.setup.endTime}` : ""}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{r.setup?.conversationWith ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{CONV_TYPES[r.conversationType] ?? r.conversationType}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{r.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
