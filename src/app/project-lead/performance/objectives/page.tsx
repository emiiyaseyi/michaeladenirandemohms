"use client"
import { useState, useEffect } from "react"
import { Target, Plus, Pencil } from "lucide-react"

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

const fi: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }

const EDITABLE = ["DRAFT", "SUBMITTED", "REJECTED", "NEEDS_CLARIFICATION"]

export default function PLObjectivesPage() {
  const [kpis, setKpis] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ cycleId: "", title: "", keyResultArea: "", weight: "", target: "", deadline: "", projectName: "", description: "" })
  const [err, setErr] = useState("")

  const load = async () => {
    setLoading(true)
    const [kd, cd] = await Promise.all([
      fetch("/api/performance/kpis?mine=true").then(r => r.json()),
      fetch("/api/performance/cycles").then(r => r.json()),
    ])
    setKpis(kd.kpis ?? [])
    setCycles(cd.cycles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeCycle = cycles.find(c => c.isActive)

  const openNew = () => {
    setEditing(null)
    setForm({ cycleId: activeCycle?.id ?? "", title: "", keyResultArea: "", weight: "", target: "", deadline: "", projectName: "", description: "" })
    setErr("")
    setModalOpen(true)
  }

  const openEdit = (k: any) => {
    setEditing(k)
    setForm({ cycleId: k.cycleId, title: k.title, keyResultArea: k.keyResultArea ?? "", weight: String(k.weight), target: k.target ?? "", deadline: k.deadline ? k.deadline.split("T")[0] : "", projectName: k.projectName ?? "", description: k.description ?? "" })
    setErr("")
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.cycleId || !form.weight) { setErr("Title, cycle, and weight are required"); return }
    setSaving(true); setErr("")
    const body = { ...form, weight: Number(form.weight), deadline: form.deadline || null, keyResultArea: form.keyResultArea || null, target: form.target || null, projectName: form.projectName || null, description: form.description || null }
    if (editing) {
      await fetch(`/api/performance/kpis/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    } else {
      await fetch("/api/performance/kpis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }
    setSaving(false); setModalOpen(false); load()
  }

  const stats = { total: kpis.length, approved: kpis.filter(k => k.status === "APPROVED" || k.status === "APPROVED_WITH_CORRECTION").length, pending: kpis.filter(k => k.status === "SUBMITTED").length, rejected: kpis.filter(k => k.status === "REJECTED").length }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Target size={22} style={{ color: "var(--primary)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>My Objectives (KPIs)</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Your personal KPI submissions for review</p>
          </div>
        </div>
        {activeCycle && (
          <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            <Plus size={14} /> Submit KPI
          </button>
        )}
      </div>

      {activeCycle && (
        <div style={{ padding: "10px 16px", background: "#EEF2FF", borderRadius: 10, marginBottom: 20, fontSize: 13, color: "#4338ca", fontWeight: 600 }}>
          Active Cycle: {activeCycle.name} ({activeCycle.year} H{activeCycle.half}){activeCycle.kpiDeadline ? ` — Deadline: ${new Date(activeCycle.kpiDeadline).toLocaleDateString()}` : ""}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[["Total KPIs", stats.total, "var(--primary)"], ["Approved", stats.approved, "#15803D"], ["Pending", stats.pending, "#D97706"], ["Rejected", stats.rejected, "#DC2626"]].map(([label, val, color]) => (
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
                {["KPI Title", "KRA", "Weight", "Progress", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : kpis.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No KPIs submitted yet.{activeCycle ? " Click \"Submit KPI\" to get started." : ""}</td></tr>
              ) : kpis.map(k => (
                <tr key={k.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                    {k.title}
                    {k.cycle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{k.cycle.name}</div>}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>{k.keyResultArea ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}>{k.weight}%</td>
                  <td style={{ padding: "12px 16px", minWidth: 120 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: "var(--primary)", width: `${k.progress ?? 0}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", minWidth: 28 }}>{k.progress ?? 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={k.status} /></td>
                  <td style={{ padding: "12px 16px" }}>
                    {EDITABLE.includes(k.status) && (
                      <button onClick={() => openEdit(k)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: "5px 8px", color: "var(--muted-foreground)", display: "flex" }}>
                        <Pencil size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setModalOpen(false)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>{editing ? "Edit KPI" : "Submit New KPI"}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Performance Cycle *</label>
                <select value={form.cycleId} onChange={e => setForm(f => ({ ...f, cycleId: e.target.value }))} style={fi} disabled={!!editing}>
                  <option value="">Select cycle…</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year} H{c.half})</option>)}
                </select>
              </div>
              {[["KPI Title", "title", "text"], ["Key Result Area", "keyResultArea", "text"], ["Weight (%)", "weight", "number"], ["Target", "target", "text"], ["Deadline", "deadline", "date"], ["Project Name", "projectName", "text"]].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{label}{["title","weight"].includes(key) ? " *" : ""}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={fi} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...fi, resize: "vertical" }} />
              </div>
              {err && <div style={{ padding: "8px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Submit KPI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
