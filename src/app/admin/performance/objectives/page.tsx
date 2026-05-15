"use client"
import { useState, useEffect } from "react"
import { Target, Search, ChevronDown } from "lucide-react"

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SUBMITTED:               { bg: "#DBEAFE", color: "#1D4ED8" },
  APPROVED:                { bg: "#DCFCE7", color: "#15803D" },
  APPROVED_WITH_CORRECTION:{ bg: "#D1FAE5", color: "#065F46" },
  REJECTED:                { bg: "#FEE2E2", color: "#DC2626" },
  NEEDS_CLARIFICATION:     { bg: "#FEF3C7", color: "#D97706" },
  DRAFT:                   { bg: "#F3F4F6", color: "#6B7280" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT
  const label = status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  return <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{label}</span>
}

const fi: React.CSSProperties = { padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none" }

export default function AdminObjectivesPage() {
  const [kpis, setKpis] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cycleFilter, setCycleFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [scoreModal, setScoreModal] = useState<any | null>(null)
  const [scoreForm, setScoreForm] = useState({ managerScore: "", finalScore: "", comments: "" })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [kd, cd] = await Promise.all([
      fetch("/api/performance/kpis").then(r => r.json()),
      fetch("/api/performance/cycles").then(r => r.json()),
    ])
    setKpis(kd.kpis ?? [])
    setCycles(cd.cycles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = kpis.filter(k => {
    if (cycleFilter !== "all" && k.cycleId !== cycleFilter) return false
    if (statusFilter !== "all" && k.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${k.employee?.firstName ?? ""} ${k.employee?.lastName ?? ""}`.toLowerCase()
      if (!name.includes(q) && !(k.title ?? "").toLowerCase().includes(q)) return false
    }
    return true
  })

  const doAction = async (id: string, action: string, extra?: Record<string, any>) => {
    setSaving(true)
    await fetch(`/api/performance/kpis/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    })
    setSaving(false); setActionMenu(null); setScoreModal(null); load()
  }

  const openScore = (kpi: any) => {
    setScoreForm({ managerScore: kpi.managerScore ?? "", finalScore: kpi.finalScore ?? "", comments: kpi.comments ?? "" })
    setScoreModal(kpi)
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Target size={22} style={{ color: "var(--primary)" }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>KPI Approval</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Review, approve, and score employee KPIs</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--background)", flex: "1 1 200px", maxWidth: 280 }}>
          <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee or KPI…" style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", flex: 1, color: "var(--foreground)" }} />
        </div>
        <select value={cycleFilter} onChange={e => setCycleFilter(e.target.value)} style={fi}>
          <option value="all">All Cycles</option>
          {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year} H{c.half})</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={fi}>
          <option value="all">All Statuses</option>
          {["SUBMITTED","APPROVED","APPROVED_WITH_CORRECTION","REJECTED","NEEDS_CLARIFICATION","DRAFT"].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["Employee", "KPI Title", "KRA", "Weight", "Target", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No KPIs found.</td></tr>
              ) : filtered.map(k => (
                <tr key={k.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                    {k.employee?.firstName} {k.employee?.lastName}
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{k.employee?.department?.name}</div>
                  </td>
                  <td style={{ padding: "12px 16px", maxWidth: 200 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.title}</div>
                    {k.cycle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{k.cycle.name}</div>}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>{k.keyResultArea ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}>{k.weight}%</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>{k.target ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={k.status} /></td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ position: "relative" }}>
                      <button onClick={() => setActionMenu(actionMenu === k.id ? null : k.id)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        Actions <ChevronDown size={12} />
                      </button>
                      {actionMenu === k.id && (
                        <div style={{ position: "absolute", top: "100%", right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 180, marginTop: 4 }}>
                          {[
                            { label: "Approve", action: "approve", color: "#15803D" },
                            { label: "Approve w/ Correction", action: "approve_with_correction", color: "#065F46" },
                            { label: "Reject", action: "reject", color: "#DC2626" },
                            { label: "Request Clarification", action: "needs_clarification", color: "#D97706" },
                          ].map(item => (
                            <div key={item.action} onClick={() => doAction(k.id, item.action)} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: item.color, fontWeight: 600 }}
                              onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                              onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = ""}>
                              {item.label}
                            </div>
                          ))}
                          <div style={{ borderTop: "1px solid var(--border)" }} />
                          <div onClick={() => { setActionMenu(null); openScore(k) }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                            onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                            onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = ""}>
                            Score KPI
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Click-outside to close action menu */}
      {actionMenu && <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setActionMenu(null)} />}

      {/* Score Modal */}
      {scoreModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setScoreModal(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 440, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Score KPI</h3>
              <button onClick={() => setScoreModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}><strong>{scoreModal.title}</strong> — {scoreModal.employee?.firstName} {scoreModal.employee?.lastName}</p>
              {[["Manager Score (0–100)", "managerScore"], ["Final Score (0–100)", "finalScore"]].map(([label, key]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{label}</label>
                  <input type="number" min={0} max={100} value={(scoreForm as any)[key]} onChange={e => setScoreForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Comments</label>
                <textarea value={scoreForm.comments} onChange={e => setScoreForm(f => ({ ...f, comments: e.target.value }))} rows={3}
                  style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setScoreModal(null)} style={{ padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => doAction(scoreModal.id, "final_score", { finalScore: Number(scoreForm.finalScore), managerScore: Number(scoreForm.managerScore), comments: scoreForm.comments })} disabled={saving}
                style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save Scores"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
