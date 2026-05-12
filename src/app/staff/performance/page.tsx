"use client"
import { useState, useEffect } from "react"
import { Target, CheckCircle2, Clock, AlertCircle, Plus, CalendarDays, Edit2, Loader2, X } from "lucide-react"
import StatCard from "@/components/ui/StatCard"
import Badge from "@/components/ui/Badge"

interface KPI {
  id: string
  title: string
  keyResultArea: string | null
  weight: number
  target: string | null
  progress: number
  status: string
  deadline: string | null
  projectName: string | null
  description: string | null
  cycleId: string
}

interface Cycle {
  id: string
  name: string
  year: number
  half: number
  startDate: string
  endDate: string
  kpiDeadline: string | null
  isActive: boolean
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)",
  color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

const EDITABLE = ["DRAFT", "SUBMITTED", "REJECTED", "NEEDS_CLARIFICATION"]

function KPIModal({
  open, onClose, cycles, initial, onSaved,
}: {
  open: boolean
  onClose: () => void
  cycles: Cycle[]
  initial: KPI | null
  onSaved: (kpi: KPI) => void
}) {
  const [form, setForm] = useState({
    cycleId: "", title: "", keyResultArea: "", weight: "",
    target: "", deadline: "", projectName: "", description: "",
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        cycleId:      initial.cycleId,
        title:        initial.title,
        keyResultArea: initial.keyResultArea ?? "",
        weight:       String(initial.weight),
        target:       initial.target ?? "",
        deadline:     initial.deadline ? initial.deadline.slice(0, 10) : "",
        projectName:  initial.projectName ?? "",
        description:  initial.description ?? "",
      })
    } else {
      const active = cycles.find(c => c.isActive)
      setForm({ cycleId: active?.id ?? cycles[0]?.id ?? "", title: "", keyResultArea: "", weight: "", target: "", deadline: "", projectName: "", description: "" })
    }
    setErr("")
  }, [open, initial, cycles])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cycleId || !form.title.trim() || !form.weight) { setErr("Cycle, title and weight are required."); return }
    setSaving(true); setErr("")
    const url    = initial ? `/api/performance/kpis/${initial.id}` : "/api/performance/kpis"
    const method = initial ? "PATCH" : "POST"
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setErr(data.error ?? "Failed to save"); return }
    onSaved(data.kpi)
    onClose()
  }

  if (!open) return null

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 540, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", border: "1px solid var(--border)" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{initial ? "Edit KPI" : "Submit KPI"}</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 4, borderRadius: 6 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "24px 24px 0", display: "flex", flexDirection: "column", gap: 16, maxHeight: "65vh", overflowY: "auto" }}>

            {/* Cycle */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Performance Cycle <span style={{ color: "#DC2626" }}>*</span></label>
              <select value={form.cycleId} onChange={set("cycleId")} style={{ ...inputStyle, appearance: "auto" }} disabled={!!initial}>
                {cycles.map(c => <option key={c.id} value={c.id}>{c.name} (H{c.half} {c.year})</option>)}
              </select>
            </div>

            {/* Title */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>KPI Title <span style={{ color: "#DC2626" }}>*</span></label>
              <input value={form.title} onChange={set("title")} placeholder="e.g. Increase customer satisfaction" style={inputStyle} />
            </div>

            {/* KRA + Weight */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Key Result Area</label>
                <input value={form.keyResultArea} onChange={set("keyResultArea")} placeholder="e.g. Customer Success" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Weight (%) <span style={{ color: "#DC2626" }}>*</span></label>
                <input type="number" min="1" max="100" value={form.weight} onChange={set("weight")} placeholder="e.g. 20" style={inputStyle} />
              </div>
            </div>

            {/* Target + Deadline */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Target</label>
                <input value={form.target} onChange={set("target")} placeholder="e.g. 95% CSAT score" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Deadline</label>
                <input type="date" value={form.deadline} onChange={set("deadline")} style={inputStyle} />
              </div>
            </div>

            {/* Project Name */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Project Name</label>
              <input value={form.projectName} onChange={set("projectName")} placeholder="Optional" style={inputStyle} />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Description</label>
              <textarea value={form.description} onChange={set("description")} rows={3} placeholder="Optional" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            </div>

            {err && <p style={{ fontSize: 13, color: "#DC2626" }}>{err}</p>}
          </div>

          <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "var(--foreground)", fontWeight: 500 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
              {initial ? "Save Changes" : "Submit KPI"}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function StaffPerformancePage() {
  const [kpis, setKpis]     = useState<KPI[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KPI | null>(null)

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/performance")
    const d = await r.json()
    setKpis(d.kpis ?? [])
    setCycles(d.cycles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeCycle = cycles.find(c => c.isActive)

  const total    = kpis.length
  const approved = kpis.filter(k => k.status === "APPROVED" || k.status === "APPROVED_WITH_CORRECTION").length
  const pending  = kpis.filter(k => k.status === "SUBMITTED" || k.status === "NEEDS_CLARIFICATION").length
  const rejected = kpis.filter(k => k.status === "REJECTED").length

  function handleSaved(kpi: KPI) {
    setKpis(prev => {
      const idx = prev.findIndex(k => k.id === kpi.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = kpi; return next }
      return [kpi, ...prev]
    })
  }

  function openEdit(kpi: KPI) { setEditing(kpi); setModalOpen(true) }
  function openNew()           { setEditing(null); setModalOpen(true) }

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Performance</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Track and manage your KPIs</p>
        </div>
        {cycles.length > 0 && (
          <button
            onClick={openNew}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> Submit KPI
          </button>
        )}
      </div>

      {/* Stat cards */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13, padding: "8px 0" }}>
          <Loader2 size={15} style={{ animation: "spin .8s linear infinite" }} /> Loading…
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 16 }}>
          <StatCard label="Total KPIs"     value={total}    icon={Target}       color="var(--primary)" />
          <StatCard label="Approved"       value={approved} icon={CheckCircle2} color="var(--success)" />
          <StatCard label="Pending Review" value={pending}  icon={Clock}        color="var(--warning)" />
          <StatCard label="Rejected"       value={rejected} icon={AlertCircle}  color="var(--danger)" />
        </div>
      )}

      {/* Active cycle banner */}
      {!loading && activeCycle && (
        <div style={{ background: "var(--primary)", borderRadius: 12, padding: "18px 24px", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CalendarDays size={18} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Cycle</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{activeCycle.name}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600, marginBottom: 2 }}>Period</div>
              <div style={{ fontSize: 13, color: "white", fontWeight: 500 }}>{fmt(activeCycle.startDate)} → {fmt(activeCycle.endDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600, marginBottom: 2 }}>Half</div>
              <div style={{ fontSize: 13, color: "white", fontWeight: 500 }}>H{activeCycle.half} {activeCycle.year}</div>
            </div>
            {activeCycle.kpiDeadline && (
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600, marginBottom: 2 }}>KPI Deadline</div>
                <div style={{ fontSize: 13, color: "white", fontWeight: 500 }}>{fmt(activeCycle.kpiDeadline)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPIs table */}
      {!loading && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>My KPIs</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Your submitted KPIs and their approval status</p>
          </div>

          {kpis.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <Target size={36} style={{ color: "var(--muted-foreground)", margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>No KPIs yet</p>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>Submit your first KPI for the active performance cycle.</p>
              {cycles.length > 0 && (
                <button onClick={openNew} style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Plus size={13} /> Submit KPI
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["KPI Title", "Key Result Area", "Weight", "Progress", "Status", ""].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpis.map(kpi => (
                    <tr key={kpi.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{kpi.title}</div>
                        {kpi.projectName && <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{kpi.projectName}</div>}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>{kpi.keyResultArea ?? "—"}</td>
                      <td style={{ padding: "14px 20px", fontSize: 13 }}>{kpi.weight}%</td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, background: "var(--primary)", width: `${kpi.progress}%` }} />
                          </div>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)", minWidth: 28 }}>{kpi.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px" }}><Badge status={kpi.status} /></td>
                      <td style={{ padding: "14px 20px" }}>
                        {EDITABLE.includes(kpi.status) && (
                          <button
                            onClick={() => openEdit(kpi)}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--foreground)", whiteSpace: "nowrap" }}>
                            <Edit2 size={11} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <KPIModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cycles={cycles}
        initial={editing}
        onSaved={handleSaved}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
