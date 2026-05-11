"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Inbox, Loader2 } from "lucide-react"

type Tab = "for_me" | "by_me"

interface Violation {
  id: string
  incidentDate: string
  details: string
  status: "APPROVED" | "DECLINED" | "TO_REVIEW"
  employee:    { firstName: string; lastName: string }
  recordedBy:  { firstName: string; lastName: string }
  violationType: { name: string }
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  APPROVED:  { bg: "#DCFCE7", color: "#16a34a", label: "Approved" },
  DECLINED:  { bg: "#FEE2E2", color: "#DC2626", label: "Declined" },
  TO_REVIEW: { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
}

export default function StaffDisciplinaryPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("for_me")
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/disciplinary/violations?view=${tab}`)
      .then(r => r.json())
      .then(d => { setViolations(d.violations ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab])

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
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        {(["for_me", "by_me"] as Tab[]).map(t => {
          const label = t === "for_me" ? "Recorded for you" : "Recorded by you"
          const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: "10px 20px", fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "var(--primary)" : "var(--muted-foreground)",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -1, transition: "all 0.15s",
              }}>
              {label}
            </button>
          )
        })}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {/* Card header */}
        <div style={{ padding: "20px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
              {tab === "for_me" ? "Violations recorded for you" : "Violations recorded by you"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              {tab === "for_me" ? "Violations assigned to you" : "Violations you recorded"}
            </p>
          </div>
          {tab === "by_me" && (
            <button
              onClick={() => router.push("/staff/disciplinary/record")}
              style={{ padding: "8px 18px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Record Violations
            </button>
          )}
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
                  {tab === "for_me" ? (
                    <>
                      <th style={th}>Violation type</th>
                      <th style={th}>Recorded by</th>
                      <th style={th}>Incident date</th>
                      <th style={th}>Description</th>
                      <th style={{ ...th, borderRight: "none" }}>Status</th>
                    </>
                  ) : (
                    <>
                      <th style={th}>Employee</th>
                      <th style={th}>Violation type</th>
                      <th style={th}>Incident date</th>
                      <th style={th}>Description</th>
                      <th style={{ ...th, borderRight: "none" }}>Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {violations.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "60px 20px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted-foreground)" }}>
                        <Inbox size={36} strokeWidth={1.2} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: 13 }}>No data</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  violations.map(v => {
                    const badge = STATUS_BADGE[v.status] ?? { bg: "#F3F4F6", color: "#6B7280", label: v.status }
                    const date = new Date(v.incidentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    return (
                      <tr key={v.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "" }}>
                        {tab === "for_me" ? (
                          <>
                            <td style={td}>{v.violationType.name}</td>
                            <td style={td}>{v.recordedBy.firstName} {v.recordedBy.lastName}</td>
                            <td style={{ ...td, color: "var(--muted-foreground)" }}>{date}</td>
                            <td style={{ ...td, color: "var(--muted-foreground)", maxWidth: 240 }}>{v.details}</td>
                          </>
                        ) : (
                          <>
                            <td style={td}>{v.employee.firstName} {v.employee.lastName}</td>
                            <td style={td}>{v.violationType.name}</td>
                            <td style={{ ...td, color: "var(--muted-foreground)" }}>{date}</td>
                            <td style={{ ...td, color: "var(--muted-foreground)", maxWidth: 240 }}>{v.details}</td>
                          </>
                        )}
                        <td style={{ ...td, borderRight: "none" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
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
