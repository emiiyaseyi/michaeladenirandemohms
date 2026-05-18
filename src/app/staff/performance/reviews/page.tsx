"use client"
import { useState, useEffect } from "react"
import { ClipboardList } from "lucide-react"

export default function StaffReviewsPage() {
  const [kpis, setKpis] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState("")
  const [loading, setLoading] = useState(true)

  const load = async (cycleId?: string) => {
    setLoading(true)
    const [kd, cd] = await Promise.all([
      fetch(`/api/performance/kpis?mine=true${cycleId ? `&cycleId=${cycleId}` : ""}`).then(r => r.json()),
      fetch("/api/performance/cycles").then(r => r.json()),
    ])
    const allCycles: any[] = cd.cycles ?? []
    setCycles(allCycles)
    setKpis(kd.kpis ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCycleChange = (id: string) => {
    setSelectedCycleId(id)
    load(id || undefined)
  }

  const avg = (arr: (number | null | undefined)[]) => {
    const vals = arr.filter(v => v != null) as number[]
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—"
  }

  const stats = {
    total: kpis.length,
    avgSelf: avg(kpis.map(k => k.selfScore)),
    avgManager: avg(kpis.map(k => k.managerScore)),
    avgFinal: avg(kpis.map(k => k.finalScore)),
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ClipboardList size={22} style={{ color: "var(--primary)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>My Appraisal Results</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>View your final performance review scores</p>
          </div>
        </div>
        <select value={selectedCycleId} onChange={e => handleCycleChange(e.target.value)}
          style={{ padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none" }}>
          <option value="">All Cycles</option>
          {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year} H{c.half}){c.isActive ? " — Active" : ""}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[["Total KPIs", stats.total, "var(--primary)"], ["Avg Self Score", stats.avgSelf, "#D97706"], ["Avg Manager Score", stats.avgManager, "#4338CA"], ["Avg Final Score", stats.avgFinal, "#15803D"]].map(([label, val, color]) => (
          <div key={label as string} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: color as string }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["KPI Title", "Weight", "Self Score", "Manager Score", "Final Score", "Comments"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : kpis.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No KPI results available yet.</td></tr>
              ) : kpis.map(k => (
                <tr key={k.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                    {k.title}
                    {k.cycle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{k.cycle.name}</div>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{k.weight}%</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{k.selfScore ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{k.managerScore ?? "—"}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: k.finalScore != null ? "var(--primary)" : "var(--muted-foreground)" }}>{k.finalScore ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12, maxWidth: 240 }}>{k.comments ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
