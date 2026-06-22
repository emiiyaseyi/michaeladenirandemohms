"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Plus, Settings, Play, Square, Trash2, CalendarRange, Loader2 } from "lucide-react"
import Modal from "@/components/ui/Modal"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

const STAGE_LABELS: Record<string, string> = {
  CONFIG: "Setup", OPEN: "Open", REVIEW: "Under review", COMPILING: "Compiling", FINALIZED: "Finalized",
}

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}
const primaryBtn: React.CSSProperties = {
  padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8,
  cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white",
}

type Cycle = {
  id: string; name: string; year: number; half: number
  startDate: string; endDate: string; kpiDeadline: string | null
  isActive: boolean; stage: string; peerCount: number
  _count: { appraisals: number; questions: number }
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    CONFIG: { bg: "var(--muted)", fg: "var(--muted-foreground)" },
    OPEN: { bg: "rgba(34,197,94,0.15)", fg: "var(--primary)" },
    REVIEW: { bg: "rgba(59,130,246,0.15)", fg: "#2563EB" },
    COMPILING: { bg: "rgba(245,158,11,0.15)", fg: "#B45309" },
    FINALIZED: { bg: "rgba(99,102,241,0.15)", fg: "#4F46E5" },
  }
  const c = colors[stage] ?? colors.CONFIG
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block" }}>
      {STAGE_LABELS[stage] ?? stage}
    </span>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span style={{ background: active ? "rgba(34,197,94,0.15)" : "var(--muted)", color: active ? "var(--primary)" : "var(--muted-foreground)", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, display: "inline-block" }}>
      {active ? "Active" : "Inactive"}
    </span>
  )
}

const blankForm = {
  name: "", year: new Date().getFullYear(), half: 1,
  startDate: "", endDate: "", kpiDeadline: "", peerCount: 3,
}

export default function CyclesListPage() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...blankForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [delTarget, setDelTarget] = useState<Cycle | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [delError, setDelError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/performance/cycles")
      const data = await res.json()
      setCycles(data.cycles ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openModal() {
    setForm({ ...blankForm })
    setError(null)
    setModalOpen(true)
  }

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/performance/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          year: Number(form.year),
          half: Number(form.half),
          startDate: form.startDate,
          endDate: form.endDate,
          kpiDeadline: form.kpiDeadline || null,
          peerCount: Number(form.peerCount),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "Failed to create cycle")
        return
      }
      setModalOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function act(c: Cycle, action: "activate" | "close") {
    if (action === "close") {
      const ok = window.confirm(
        `Close "${c.name}"?\n\nThis ends the cycle and sends the FINAL REPORT EMAIL from HR to every staff member with a finalized appraisal (their score breakdown + management comment).\n\nThe cycle must be at the Finalized stage. This cannot be undone.`,
      )
      if (!ok) return
    }
    setBusyId(c.id)
    try {
      const res = await fetch(`/api/performance/cycles/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error ?? "Action failed"); return }
      if (action === "close" && d.emailsSent) alert("Cycle closed. Final report emails have been sent to staff.")
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!delTarget) return
    setDeleting(true)
    setDelError(null)
    try {
      const res = await fetch(`/api/performance/cycles/${delTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setDelError(d.error ?? "Failed to delete cycle")
        return
      }
      setDelTarget(null)
      await load()
    } finally {
      setDeleting(false)
    }
  }

  const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "12px", fontSize: 13, color: "var(--foreground)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }
  const iconBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--background)", color: "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none" }
  const fieldWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 }
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--foreground)" }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <CalendarRange size={26} style={{ color: "var(--primary)", marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Appraisal Cycles</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Create and manage performance appraisal cycles.</p>
        </div>
        <button onClick={openModal} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={15} /> New Cycle
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : cycles.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No cycles yet. Create one to get started.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Period</th>
                <th style={th}>Dates</th>
                <th style={th}>Stage</th>
                <th style={th}>Active</th>
                <th style={th}>Appraisals</th>
                <th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map(c => (
                <tr key={c.id}>
                  <td style={td}><span style={{ fontWeight: 700 }}>{c.name}</span></td>
                  <td style={td}>H{c.half} {c.year}</td>
                  <td style={td}>{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</td>
                  <td style={td}><StageBadge stage={c.stage} /></td>
                  <td style={td}><ActiveBadge active={c.isActive} /></td>
                  <td style={td}>{c._count?.appraisals ?? 0}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Link href={`/admin/performance/cycles/${c.id}`} style={iconBtn}>
                        <Settings size={13} /> Configure
                      </Link>
                      {!c.isActive ? (
                        <button onClick={() => act(c, "activate")} disabled={busyId === c.id} style={{ ...iconBtn, opacity: busyId === c.id ? 0.6 : 1 }}>
                          <Play size={13} /> Activate
                        </button>
                      ) : (
                        <button onClick={() => act(c, "close")} disabled={busyId === c.id} style={{ ...iconBtn, opacity: busyId === c.id ? 0.6 : 1 }}>
                          <Square size={13} /> Close
                        </button>
                      )}
                      <button onClick={() => { setDelTarget(c); setDelError(null) }} style={{ ...iconBtn, color: "#DC2626", borderColor: "rgba(220,38,38,0.4)" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title="New Cycle" width={520}>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={fieldWrap}>
            <label style={lbl}>Name</label>
            <input style={fi} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. H1 2026 Appraisal" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={fieldWrap}>
              <label style={lbl}>Year</label>
              <input type="number" style={fi} value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Half</label>
              <select style={fi} value={form.half} onChange={e => setForm({ ...form, half: Number(e.target.value) })}>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={fieldWrap}>
              <label style={lbl}>Start date</label>
              <input type="date" style={fi} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>End date</label>
              <input type="date" style={fi} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={fieldWrap}>
              <label style={lbl}>KPI deadline (optional)</label>
              <input type="date" style={fi} value={form.kpiDeadline} onChange={e => setForm({ ...form, kpiDeadline: e.target.value })} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Peer count</label>
              <input type="number" style={fi} value={form.peerCount} onChange={e => setForm({ ...form, peerCount: Number(e.target.value) })} />
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: "#DC2626", background: "rgba(220,38,38,0.08)", padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => setModalOpen(false)} disabled={saving} style={{ padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
            {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            {saving ? "Creating…" : "Create cycle"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={confirmDelete}
        title="Delete cycle"
        body={<>Delete <strong>{delTarget?.name}</strong>? This cannot be undone.{delError && <div style={{ marginTop: 10, color: "#DC2626" }}>{delError}</div>}</>}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
