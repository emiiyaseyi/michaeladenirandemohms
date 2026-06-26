"use client"
import { useState, useEffect } from "react"
import { Inbox, Loader2 } from "lucide-react"

interface Assignment {
  id: string
  assignedOn: string | null
  description: string | null
  status: string
  asset: {
    name: string
    identifier: string | null
    description: string | null
    commissionDate: string | null
    assetType: { name: string } | null
  }
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ASSIGNED: { bg: "#DCFCE7", color: "#16a34a", label: "Assigned" },
  RELEASED: { bg: "#F3F4F6", color: "#6B7280", label: "Released" },
}

export default function StaffAssetsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/assets/my-assignments")
      .then(r => r.json())
      .then(d => { setAssignments(d.assignments ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const th: React.CSSProperties = {
    padding: "11px 20px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: "var(--foreground)", background: "var(--muted)",
    borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)",
  }
  const td: React.CSSProperties = {
    padding: "13px 20px", fontSize: 13, borderBottom: "1px solid var(--border)",
    borderRight: "1px solid var(--border)", verticalAlign: "middle",
  }

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 700, color: "var(--muted-foreground)" }}>Employee Assets</div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Assets assigned to you</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>These are assets (computer, cars, etc) assigned to you</p>
        </div>
        <div style={{ height: 1, background: "var(--border)" }} />

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Asset type</th>
                  <th style={th}>Asset Name and ID</th>
                  <th style={th}>Description</th>
                  <th style={th}>Commissioned On</th>
                  <th style={{ ...th, borderRight: "none" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "60px 20px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted-foreground)" }}>
                        <Inbox size={36} strokeWidth={1.2} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: 13 }}>No data</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  assignments.map(a => {
                    const badge = STATUS_BADGE[a.status] ?? { bg: "#F3F4F6", color: "#6B7280", label: a.status }
                    const commissioned = a.asset.commissionDate
                      ? new Date(a.asset.commissionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "-"
                    return (
                      <tr key={a.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "" }}>
                        <td style={td}>{a.asset.assetType?.name ?? "-"}</td>
                        <td style={td}>
                          <span style={{ fontWeight: 600 }}>{a.asset.name}</span>
                          {a.asset.identifier && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{a.asset.identifier}</span>
                          )}
                        </td>
                        <td style={{ ...td, color: "var(--muted-foreground)", maxWidth: 220 }}>
                          {a.description || a.asset.description || "-"}
                        </td>
                        <td style={{ ...td, color: "var(--muted-foreground)" }}>{commissioned}</td>
                        <td style={{ ...td, borderRight: "none" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ height: 1, background: "var(--border)" }} />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
