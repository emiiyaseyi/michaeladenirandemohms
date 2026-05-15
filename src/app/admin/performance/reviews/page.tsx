"use client"
import { useState, useEffect } from "react"
import { BarChart2, XCircle, ChevronDown, ChevronUp } from "lucide-react"

export default function AdminReviewsPage() {
  const [cycles, setCycles] = useState<any[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState("all")
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  const load = async () => {
    setLoading(true)
    const [cd, kd] = await Promise.all([
      fetch("/api/performance/cycles").then(r => r.json()),
      fetch(`/api/performance/kpis${selectedCycleId !== "all" ? `?cycleId=${selectedCycleId}` : ""}`).then(r => r.json()),
    ])
    setCycles(cd.cycles ?? [])
    setKpis(kd.kpis ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedCycleId])

  const activeCycle = cycles.find(c => c.isActive)

  // Group KPIs by employee
  const byEmployee = new Map<string, { employee: any; kpis: any[] }>()
  for (const k of kpis) {
    const empId = k.employeeId
    if (!byEmployee.has(empId)) byEmployee.set(empId, { employee: k.employee, kpis: [] })
    byEmployee.get(empId)!.kpis.push(k)
  }
  const employeeRows = [...byEmployee.values()]

  const avg = (arr: (number | null | undefined)[]) => {
    const vals = arr.filter(v => v !== null && v !== undefined) as number[]
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—"
  }

  const totalKPIs = kpis.length
  const scored = kpis.filter(k => k.finalScore !== null && k.finalScore !== undefined).length
  const pending = totalKPIs - scored
  const avgFinal = avg(kpis.map(k => k.finalScore))

  const handleClose = async () => {
    if (!activeCycle) return
    if (!confirm(`Close cycle "${activeCycle.name}"? This will deactivate it.`)) return
    setClosing(true)
    await fetch(`/api/performance/cycles/${activeCycle.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close" }),
    })
    setClosing(false); load()
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BarChart2 size={22} style={{ color: "var(--primary)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Review Close-Out</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Final scores and cycle management</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)}
            style={{ padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none" }}>
            <option value="all">All Cycles</option>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year} H{c.half}){c.isActive ? " — Active" : ""}</option>)}
          </select>
          {activeCycle && (
            <button onClick={handleClose} disabled={closing}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#FEE2E2", border: "1px solid #fca5a5", borderRadius: 8, cursor: closing ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "#DC2626", opacity: closing ? 0.7 : 1 }}>
              <XCircle size={14} /> Close Cycle
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total KPIs", value: totalKPIs, color: "var(--primary)" },
          { label: "Fully Scored", value: scored, color: "#15803D" },
          { label: "Pending Score", value: pending, color: "#D97706" },
          { label: "Avg Final Score", value: `${avgFinal}`, color: "#6366f1" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["Employee", "Department", "# KPIs", "Avg Self", "Avg Manager", "Avg Final", "Evidence", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : employeeRows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No KPI data for this period.</td></tr>
              ) : employeeRows.map(({ employee, kpis: eks }) => {
                const isExpanded = expanded === employee?.id
                const evidenceCount = eks.filter(k => k.evidenceUrl).length
                return (
                  <>
                    <tr key={employee?.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>{employee?.firstName} {employee?.lastName}</td>
                      <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>{employee?.department?.name ?? "—"}</td>
                      <td style={{ padding: "12px 16px" }}>{eks.length}</td>
                      <td style={{ padding: "12px 16px" }}>{avg(eks.map(k => k.selfScore))}</td>
                      <td style={{ padding: "12px 16px" }}>{avg(eks.map(k => k.managerScore))}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--primary)" }}>{avg(eks.map(k => k.finalScore))}</td>
                      <td style={{ padding: "12px 16px" }}>
                        {evidenceCount > 0 ? <span style={{ fontSize: 11, fontWeight: 700, color: "#15803D" }}>{evidenceCount}/{eks.length}</span> : <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>None</span>}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button onClick={() => setExpanded(isExpanded ? null : employee?.id)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: "4px 8px", color: "var(--muted-foreground)", display: "flex" }}>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && eks.map((k: any) => (
                      <tr key={k.id} style={{ background: "rgba(0,0,0,0.02)", borderTop: "1px solid var(--border)" }}>
                        <td colSpan={2} style={{ padding: "8px 16px 8px 32px", fontSize: 12, color: "var(--foreground)" }}>↳ {k.title}</td>
                        <td style={{ padding: "8px 16px", fontSize: 12 }}>{k.weight}%</td>
                        <td style={{ padding: "8px 16px", fontSize: 12 }}>{k.selfScore ?? "—"}</td>
                        <td style={{ padding: "8px 16px", fontSize: 12 }}>{k.managerScore ?? "—"}</td>
                        <td style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600 }}>{k.finalScore ?? "—"}</td>
                        <td style={{ padding: "8px 16px" }}>
                          {k.evidenceUrl ? <a href={k.evidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>View</a> : "—"}
                        </td>
                        <td />
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
