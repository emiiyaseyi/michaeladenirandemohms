"use client"

import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"

interface Row {
  rank: number
  employeeId: string
  name: string
  jobTitle: string | null
  score: number
  note: string | null
  isMe: boolean
}
interface CategoryBlock { category: string; rows: Row[] }
interface Data { cycle: { id: string; name: string } | null; meId: string | null; categories: CategoryBlock[] }

const CATEGORY_LABELS: Record<string, string> = {
  BRAND: "Strategic Brand Visibility & Engagement",
  LEARNING: "Learning & Development",
  ATTENDANCE: "Work Discipline & Attendance",
}

const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }
const th: React.CSSProperties = { textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "8px 12px", borderBottom: "1px solid var(--border)" }
const td: React.CSSProperties = { fontSize: 13, padding: "10px 12px", borderBottom: "1px solid var(--border)" }

export default function LeaderboardsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/performance/leaderboards")
      .then(r => r.json())
      .then((d: Data) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Trophy size={22} color="var(--primary)" />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Leaderboards</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Org-wide admin-scored items{data?.cycle ? ` · ${data.cycle.name}` : ""} - imported by HR. These scores feed your appraisal; check yours and raise any issue with HR.
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 24, color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</p>
      ) : !data || !data.categories.length ? (
        <div style={{ ...card, marginTop: 24, color: "var(--muted-foreground)", fontSize: 14 }}>
          No leaderboard data yet. HR uploads these scores during cycle configuration.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 24 }}>
          {data.categories.map(block => (
            <div key={block.category} style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{CATEGORY_LABELS[block.category] ?? block.category}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>Ranked by score</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: 60 }}>Rank</th>
                      <th style={th}>Name</th>
                      <th style={{ ...th, width: 90 }}>Score</th>
                      <th style={th}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map(r => (
                      <tr key={r.employeeId} style={r.isMe ? { background: "var(--muted)" } : undefined}>
                        <td style={{ ...td, fontWeight: 800 }}>{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td>
                        <td style={td}>
                          <span style={{ fontWeight: r.isMe ? 800 : 600 }}>{r.name}</span>
                          {r.isMe && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>You</span>}
                          {r.jobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.jobTitle}</div>}
                        </td>
                        <td style={{ ...td, fontWeight: 800 }}>{r.score}</td>
                        <td style={{ ...td, color: "var(--muted-foreground)" }}>{r.note ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
