"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Inbox, Loader2 } from "lucide-react"

interface Survey {
  id: string
  title: string
  status: "DRAFT" | "ACTIVE" | "CLOSED"
}

export default function StaffSurveysPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/surveys?status=ACTIVE")
      .then(r => r.json())
      .then(d => { setSurveys(d.surveys ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const th: React.CSSProperties = {
    padding: "11px 20px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: "var(--foreground)", background: "var(--muted)",
    borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)",
  }
  const td: React.CSSProperties = {
    padding: "13px 20px", fontSize: 13, borderBottom: "1px solid var(--border)",
    borderRight: "1px solid var(--border)",
  }

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Surveys</div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Title</th>
                  <th style={{ ...th, borderRight: "none" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {surveys.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ padding: "60px 20px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted-foreground)" }}>
                        <Inbox size={36} strokeWidth={1.2} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: 13 }}>No data</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  surveys.map(s => (
                    <tr key={s.id} style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/staff/surveys/${s.id}`)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "" }}>
                      <td style={td}><span style={{ fontWeight: 600 }}>{s.title}</span></td>
                      <td style={{ ...td, borderRight: "none" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#DCFCE7", color: "#16a34a" }}>
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
