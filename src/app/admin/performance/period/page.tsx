"use client"
import { useState, useEffect } from "react"
import { TrendingUp, Plus, Pencil, Trash2, CheckCircle, XCircle, Calendar } from "lucide-react"
import { format } from "date-fns"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

function StatusBadge({ cycle }: { cycle: any }) {
  if (cycle.isActive) return <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#DCFCE7", color: "#15803D" }}>Active</span>
  return <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "var(--muted)", color: "var(--muted-foreground)" }}>Draft</span>
}

const fi: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }

export default function PerformancePeriodPage() {
  const [cycles, setCycles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", year: String(new Date().getFullYear()), half: "1", startDate: "", endDate: "", kpiDeadline: "" })

  const load = async () => {
    setLoading(true)
    const d = await fetch("/api/performance/cycles").then(r => r.json())
    setCycles(d.cycles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm({ name: "", year: String(new Date().getFullYear()), half: "1", startDate: "", endDate: "", kpiDeadline: "" }); setModalOpen(true) }
  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name, year: String(c.year), half: String(c.half), startDate: c.startDate ? format(new Date(c.startDate), "yyyy-MM-dd") : "", endDate: c.endDate ? format(new Date(c.endDate), "yyyy-MM-dd") : "", kpiDeadline: c.kpiDeadline ? format(new Date(c.kpiDeadline), "yyyy-MM-dd") : "" }); setModalOpen(true) }

  const handleSave = async () => {
    setSaving(true)
    if (editing) {
      await fetch(`/api/performance/cycles/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, startDate: form.startDate, endDate: form.endDate, kpiDeadline: form.kpiDeadline || null }) })
    } else {
      await fetch("/api/performance/cycles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, year: Number(form.year), half: Number(form.half), startDate: form.startDate, endDate: form.endDate, kpiDeadline: form.kpiDeadline || null }) })
    }
    setSaving(false); setModalOpen(false); load()
  }

  const handleActivate = async (id: string) => {
    await fetch(`/api/performance/cycles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "activate" }) })
    load()
  }

  const handleClose = async (id: string) => {
    await fetch(`/api/performance/cycles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close" }) })
    load()
  }

  const [delTarget, setDelTarget] = useState<string | null>(null)
  const [delErr, setDelErr] = useState("")
  const [deleting, setDeleting] = useState(false)
  const handleDelete = (id: string) => { setDelErr(""); setDelTarget(id) }
  const doDelete = async () => {
    if (!delTarget) return
    setDeleting(true); setDelErr("")
    const r = await fetch(`/api/performance/cycles/${delTarget}`, { method: "DELETE" })
    const d = await r.json()
    setDeleting(false)
    if (!r.ok) { setDelErr(d.error ?? "Failed"); return }
    setDelTarget(null); load()
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Calendar size={22} style={{ color: "var(--primary)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Performance Cycles</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Manage performance review periods</p>
          </div>
        </div>
        <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
          <Plus size={14} /> New Cycle
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["Cycle Name", "Year", "Half", "Period", "KPI Deadline", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : cycles.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>
                  <TrendingUp size={32} style={{ margin: "0 auto 10px", display: "block", opacity: 0.3 }} />
                  No cycles yet. Create your first performance cycle.
                </td></tr>
              ) : cycles.map(c => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700 }}>{c.name}</td>
                  <td style={{ padding: "14px 16px", color: "var(--muted-foreground)" }}>{c.year}</td>
                  <td style={{ padding: "14px 16px", color: "var(--muted-foreground)" }}>H{c.half}</td>
                  <td style={{ padding: "14px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>
                    {format(new Date(c.startDate), "MMM d, yyyy")} – {format(new Date(c.endDate), "MMM d, yyyy")}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>
                    {c.kpiDeadline ? format(new Date(c.kpiDeadline), "MMM d, yyyy") : "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge cycle={c} /></td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {!c.isActive && (
                        <button onClick={() => handleActivate(c.id)} title="Activate" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "#DCFCE7", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#15803D" }}>
                          <CheckCircle size={12} /> Activate
                        </button>
                      )}
                      {c.isActive && (
                        <button onClick={() => handleClose(c.id)} title="Close" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>
                          <XCircle size={12} /> Close
                        </button>
                      )}
                      <button onClick={() => openEdit(c)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: "5px 8px", color: "var(--muted-foreground)", display: "flex" }}><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: "5px 8px", color: "#ef4444", display: "flex" }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setModalOpen(false)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 480, width: "100%", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>{editing ? "Edit Cycle" : "New Performance Cycle"}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {[["Cycle Name", "name", "text"], ["Year", "year", "number"], ["Start Date", "startDate", "date"], ["End Date", "endDate", "date"], ["KPI Deadline", "kpiDeadline", "date"]].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={fi} />
                </div>
              ))}
              {!editing && (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Half</label>
                  <select value={form.half} onChange={e => setForm(f => ({ ...f, half: e.target.value }))} style={fi}>
                    <option value="1">H1 (Jan–Jun)</option>
                    <option value="2">H2 (Jul–Dec)</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Cycle"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => { setDelTarget(null); setDelErr("") }}
        onConfirm={doDelete}
        title="Delete cycle?"
        body={<div>Delete this performance cycle? This cannot be undone.{delErr && <div style={{ marginTop: 10, padding: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", borderRadius: 6, fontSize: 12 }}>{delErr}</div>}</div>}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
