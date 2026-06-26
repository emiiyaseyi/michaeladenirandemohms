"use client"
import { useState, useEffect } from "react"
import { FolderKanban, Loader2, Inbox, Calendar, Users } from "lucide-react"

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: "#DCFCE7", color: "#16a34a", label: "Active" },
  ON_HOLD:   { bg: "#FEF3C7", color: "#D97706", label: "On Hold" },
  COMPLETED: { bg: "#DBEAFE", color: "#2563eb", label: "Completed" },
  CANCELLED: { bg: "#FEE2E2", color: "#DC2626", label: "Cancelled" },
}

export default function StaffProjectsPage() {
  const [memberships, setMemberships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/staff/projects")
      .then(r => r.json())
      .then(d => { setMemberships(d.memberships ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <FolderKanban size={20} style={{ color: "var(--primary)" }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>My Projects</h2>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
          Projects you have been assigned to by your Project Lead
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
          <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
        </div>
      ) : memberships.length === 0 ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "60px 20px", textAlign: "center" }}>
          <Inbox size={36} strokeWidth={1.2} style={{ color: "var(--border)", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Not assigned to any projects</div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>Your Project Lead will assign you to projects as they are created.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {memberships.map((m: any) => {
            const p = m.project
            const s = STATUS_COLORS[p.status] ?? STATUS_COLORS.ACTIVE
            return (
              <div key={m.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ height: 3, background: "var(--primary)" }} />
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{p.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {s.label}
                    </span>
                  </div>

                  {p.description && (
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 10px", lineHeight: 1.5 }}>{p.description}</p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      <strong style={{ color: "var(--foreground)" }}>{p.department.name}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      Lead: <strong style={{ color: "var(--foreground)" }}>{p.lead.firstName} {p.lead.lastName}</strong>
                    </div>
                    {m.projectRole && (
                      <div style={{ fontSize: 12 }}>
                        Your role: <strong style={{ color: "var(--primary)" }}>{m.projectRole}</strong>
                      </div>
                    )}
                    {(p.startDate || p.endDate) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <Calendar size={11} />
                        {p.startDate ? new Date(p.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                        {" → "}
                        {p.endDate ? new Date(p.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Ongoing"}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                      Assigned {new Date(m.assignedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
