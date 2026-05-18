"use client"
import { useState, useEffect, useRef } from "react"
import { Target, Upload, Pencil } from "lucide-react"

const KPI_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]

const fi: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }

export default function StaffObjectivesPage() {
  const [kpis, setKpis] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updateModal, setUpdateModal] = useState<any | null>(null)
  const [form, setForm] = useState({ selfScore: "", progress: "", kpiStatus: "IN_PROGRESS" })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const [kd, cd] = await Promise.all([
      fetch("/api/performance/kpis?mine=true").then(r => r.json()),
      fetch("/api/performance/cycles").then(r => r.json()),
    ])
    setKpis((kd.kpis ?? []).filter((k: any) => k.status === "APPROVED" || k.status === "APPROVED_WITH_CORRECTION"))
    setCycles(cd.cycles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeCycle = cycles.find(c => c.isActive)

  const openUpdate = (k: any) => {
    setUpdateModal(k)
    setForm({ selfScore: k.selfScore ?? "", progress: k.progress ?? "0", kpiStatus: k.kpiStatus ?? "IN_PROGRESS" })
    setFile(null)
    setErr("")
  }

  const handleSave = async () => {
    if (!form.selfScore) { setErr("Self score is required"); return }
    const score = Number(form.selfScore)
    if (score < 0 || score > 100) { setErr("Score must be between 0 and 100"); return }
    setSaving(true); setErr("")
    await fetch(`/api/performance/kpis/${updateModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "self_score", selfScore: score, progress: Number(form.progress), kpiStatus: form.kpiStatus }),
    })
    if (file) {
      const fd = new FormData()
      fd.append("file", file)
      await fetch(`/api/performance/kpis/${updateModal.id}/evidence`, { method: "POST", body: fd })
    }
    setSaving(false); setUpdateModal(null); load()
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Target size={22} style={{ color: "var(--primary)" }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>My Approved KPIs</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Update your self-score, progress, and upload evidence</p>
        </div>
      </div>

      {activeCycle && (
        <div style={{ padding: "10px 16px", background: "#EEF2FF", borderRadius: 10, marginBottom: 20, fontSize: 13, color: "#4338ca", fontWeight: 600 }}>
          Active Cycle: {activeCycle.name} ({activeCycle.year} H{activeCycle.half}){activeCycle.kpiDeadline ? ` — Deadline: ${new Date(activeCycle.kpiDeadline).toLocaleDateString()}` : ""}
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["KPI Title", "KRA", "Weight", "Target", "Self Score", "Progress", "KPI Status", "Evidence", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : kpis.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No approved KPIs yet. Once your KPIs are approved, they will appear here for self-scoring.</td></tr>
              ) : kpis.map(k => (
                <tr key={k.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                    {k.title}
                    {k.cycle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{k.cycle.name}</div>}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>{k.keyResultArea ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}>{k.weight}%</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>{k.target ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}>{k.selfScore ?? <span style={{ color: "var(--muted-foreground)" }}>—</span>}</td>
                  <td style={{ padding: "12px 16px", minWidth: 120 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: "var(--primary)", width: `${k.progress ?? 0}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", minWidth: 28 }}>{k.progress ?? 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted-foreground)" }}>{(k.kpiStatus ?? "NOT_STARTED").replace(/_/g, " ")}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {k.evidenceUrl
                      ? <a href={k.evidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>View</a>
                      : <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>None</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => openUpdate(k)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: "5px 8px", color: "var(--muted-foreground)", display: "flex" }}>
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {updateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setUpdateModal(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 460, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Update KPI Progress</h3>
              <button onClick={() => setUpdateModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}><strong>{updateModal.title}</strong></p>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Self Score (0–100) *</label>
                <input type="number" min={0} max={100} value={form.selfScore} onChange={e => setForm(f => ({ ...f, selfScore: e.target.value }))} style={fi} placeholder="Enter score" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Progress ({form.progress}%)</label>
                <input type="range" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} style={{ width: "100%", accentColor: "var(--primary)" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>KPI Status</label>
                <select value={form.kpiStatus} onChange={e => setForm(f => ({ ...f, kpiStatus: e.target.value }))} style={fi}>
                  {KPI_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Evidence Upload (PDF, DOCX, XLSX, JPG, PNG — max 10MB)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  <button type="button" onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    <Upload size={13} /> {file ? file.name : (updateModal.evidenceUrl ? "Replace File" : "Choose File")}
                  </button>
                  {file && <button type="button" onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted-foreground)", lineHeight: 1 }}>×</button>}
                </div>
                {updateModal.evidenceUrl && !file && <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>Current: <a href={updateModal.evidenceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>View existing</a></p>}
              </div>
              {err && <div style={{ padding: "8px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setUpdateModal(null)} style={{ padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
