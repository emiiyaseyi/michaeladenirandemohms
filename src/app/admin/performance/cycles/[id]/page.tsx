"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, SlidersHorizontal, ListChecks, Target, Scale, Gavel,
  Plus, Trash2, Pencil, Check, X, Users, Wand2, Loader2, FileStack,
  Upload,
} from "lucide-react"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

const STAGES = ["CONFIG", "OPEN", "REVIEW", "COMPILING", "FINALIZED"] as const
const STAGE_LABELS: Record<string, string> = {
  CONFIG: "Setup", OPEN: "Open", REVIEW: "Under review", COMPILING: "Compiling", FINALIZED: "Finalized",
}
const QUESTION_GROUPS: { section: string; label: string; scaleMax: number }[] = [
  { section: "BEHAVIOURAL", label: "Behavioural (scale 5)", scaleMax: 5 },
  { section: "PEER", label: "Peer review (scale 5)", scaleMax: 5 },
  { section: "CORE_VALUE", label: "Core values (scale 3)", scaleMax: 3 },
]

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}
const primaryBtn: React.CSSProperties = {
  padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8,
  cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white",
}
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px",
  border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--background)",
  color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer",
}
const iconBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6,
  border: "1.5px solid var(--border)", borderRadius: 7, background: "var(--background)",
  color: "var(--foreground)", cursor: "pointer",
}

type Question = { id: string; section: string; text: string; scaleMax: number; order: number }
type GlobalKpi = { id: string; projectName: string; deliverable: string; kpi: string; weight: number; order: number }
type Band = { label: string; min?: number; max?: number; points: number; warnings?: number; badges?: number }
type Weights = { behavioural: number; jobSpecific: number; coreValues: number; recommendation: number; query: number }
type Cycle = {
  id: string; name: string; year: number; half: number
  startDate: string; endDate: string; kpiDeadline: string | null
  isActive: boolean; stage: string; peerCount: number
  weights: Weights
  queryBands: Band[]
  recommendationBands: Band[]
  questions: Question[]
  globalKpis: GlobalKpi[]
  _count: { appraisals: number }
}

function jpatch(url: string, body: unknown) {
  return fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
}
function jpost(url: string, body?: unknown) {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) })
}

function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: subtitle ? 4 : 14 }}>
        <span style={{ color: "var(--primary)", display: "inline-flex" }}>{icon}</span>
        <h2 style={{ fontSize: 15, fontWeight: 800 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 14 }}>{subtitle}</p>}
      {children}
    </div>
  )
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, color: "var(--foreground)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }

function StageStepper({ current }: { current: string }) {
  const idx = STAGES.indexOf(current as typeof STAGES[number])
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
      {STAGES.map((s, i) => {
        const done = i < idx, active = i === idx
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: active ? "var(--primary)" : done ? "rgba(34,197,94,0.15)" : "var(--muted)",
              color: active ? "white" : done ? "var(--primary)" : "var(--muted-foreground)",
            }}>{STAGE_LABELS[s]}</span>
            {i < STAGES.length - 1 && <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>→</span>}
          </div>
        )
      })}
    </div>
  )
}

// ---- Section A: Stage controls ----
function StageControls({ cycle, refetch }: { cycle: Cycle; refetch: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key); setInfo(null)
    try { await fn() } finally { setBusy(null) }
  }

  return (
    <SectionCard icon={<SlidersHorizontal size={17} />} title="Stage controls">
      <StageStepper current={cycle.stage} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {cycle.stage === "CONFIG" && (
          <>
            <button disabled={!!busy} style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }}
              onClick={() => run("defaults", async () => {
                await jpost(`/api/performance/cycles/${cycle.id}/load-defaults`)
                await refetch()
                setInfo("Template defaults loaded.")
              })}>
              {busy === "defaults" ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <FileStack size={14} />} Load template defaults
            </button>
            <button disabled={!!busy} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6, opacity: busy ? 0.6 : 1 }}
              onClick={() => run("generate", async () => {
                const res = await jpost(`/api/performance/cycles/${cycle.id}/generate`)
                const d = await res.json().catch(() => ({}))
                await refetch()
                setInfo(`Generated ${d.created ?? 0} appraisals and opened the cycle.`)
              })}>
              {busy === "generate" ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Check size={14} />} Generate appraisals & Open
            </button>
          </>
        )}
        <button disabled={!!busy} style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }}
          onClick={() => run("peers", async () => {
            const res = await jpost(`/api/performance/cycles/${cycle.id}/autofill-peers`)
            const d = await res.json().catch(() => ({}))
            await refetch()
            setInfo(`Auto-assigned ${d.assigned ?? 0} peers.`)
          })}>
          {busy === "peers" ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Users size={14} />} Auto-assign peers
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted-foreground)" }}>Set stage</label>
          <select value={cycle.stage} disabled={!!busy} style={{ ...fi, width: "auto" }}
            onChange={e => run("stage", async () => {
              await jpatch(`/api/performance/cycles/${cycle.id}`, { action: "setStage", stage: e.target.value })
              await refetch()
            })}>
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      {info && <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--primary)", background: "rgba(34,197,94,0.1)", padding: "8px 12px", borderRadius: 8 }}>{info}</div>}
    </SectionCard>
  )
}

// ---- Section B: Weights ----
function WeightsEditor({ cycle, refetch }: { cycle: Cycle; refetch: () => Promise<void> }) {
  const [w, setW] = useState<Weights>(cycle.weights)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setW(cycle.weights) }, [cycle.weights])

  const keys: { k: keyof Weights; label: string }[] = [
    { k: "behavioural", label: "Behavioural" },
    { k: "jobSpecific", label: "Job specific" },
    { k: "coreValues", label: "Core values" },
    { k: "recommendation", label: "Recommendation" },
    { k: "query", label: "Query" },
  ]
  const sum = keys.reduce((a, { k }) => a + (Number(w[k]) || 0), 0)

  async function save() {
    setSaving(true)
    try {
      await jpatch(`/api/performance/cycles/${cycle.id}`, {
        weights: {
          behavioural: Number(w.behavioural), jobSpecific: Number(w.jobSpecific),
          coreValues: Number(w.coreValues), recommendation: Number(w.recommendation), query: Number(w.query),
        },
      })
      await refetch()
    } finally { setSaving(false) }
  }

  return (
    <SectionCard icon={<Scale size={17} />} title="Section weights">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginBottom: 14 }}>
        {keys.map(({ k, label }) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>{label}</label>
            <input type="number" style={fi} value={w[k]} onChange={e => setW({ ...w, [k]: Number(e.target.value) })} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Sum: {sum}</span>
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Weighted sections should total ~100 (query subtracts).</span>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto", opacity: saving ? 0.6 : 1 }}>
          {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />} Save weights
        </button>
      </div>
    </SectionCard>
  )
}

// ---- Section C: Questions ----
function QuestionRow({ q, onSaved, onDelete }: { q: Question; onSaved: () => Promise<void>; onDelete: (q: Question) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(q.text)
  const [scaleMax, setScaleMax] = useState(q.scaleMax)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setText(q.text); setScaleMax(q.scaleMax) }, [q])

  async function save() {
    setSaving(true)
    try {
      await jpatch(`/api/performance/questions/${q.id}`, { text, scaleMax: Number(scaleMax) })
      setEditing(false)
      await onSaved()
    } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <tr>
        <td style={td}><input style={fi} value={text} onChange={e => setText(e.target.value)} /></td>
        <td style={{ ...td, width: 80 }}><input type="number" style={fi} value={scaleMax} onChange={e => setScaleMax(Number(e.target.value))} /></td>
        <td style={{ ...td, width: 90, textAlign: "right" }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button onClick={save} disabled={saving} style={{ ...iconBtn, color: "var(--primary)" }}>{saving ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Check size={14} />}</button>
            <button onClick={() => { setEditing(false); setText(q.text); setScaleMax(q.scaleMax) }} style={iconBtn}><X size={14} /></button>
          </div>
        </td>
      </tr>
    )
  }
  return (
    <tr>
      <td style={td}>{q.text}</td>
      <td style={{ ...td, width: 80 }}>{q.scaleMax}</td>
      <td style={{ ...td, width: 90, textAlign: "right" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button onClick={() => setEditing(true)} style={iconBtn}><Pencil size={13} /></button>
          <button onClick={() => onDelete(q)} style={{ ...iconBtn, color: "#DC2626", borderColor: "rgba(220,38,38,0.4)" }}><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  )
}

function QuestionGroup({ cycle, section, label, scaleMax, refetch, onDelete }: {
  cycle: Cycle; section: string; label: string; scaleMax: number
  refetch: () => Promise<void>; onDelete: (q: Question) => void
}) {
  const [text, setText] = useState("")
  const [adding, setAdding] = useState(false)
  // Peers rate the SAME Behavioural items (the 360). The PEER group mirrors the
  // Behavioural questions read-only instead of being a separate, editable list.
  const mirror = section === "PEER"
  const sourceSection = mirror ? "BEHAVIOURAL" : section
  const items = cycle.questions.filter(q => q.section === sourceSection).sort((a, b) => a.order - b.order)

  async function add() {
    if (!text.trim()) return
    setAdding(true)
    try {
      await jpost("/api/performance/questions", { cycleId: cycle.id, section, text: text.trim(), scaleMax })
      setText("")
      await refetch()
    } finally { setAdding(false) }
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: mirror ? 4 : 8 }}>{label}</h3>
      {mirror && (
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>
          Peers rate the same Behavioural questions above, on the same 0–5 scale. Edit them in the Behavioural section.
        </p>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr><th style={th}>Question</th><th style={{ ...th, width: 80 }}>Scale</th><th style={{ ...th, width: 90, textAlign: "right" }}>Actions</th></tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td style={{ ...td, color: "var(--muted-foreground)" }} colSpan={3}>No questions yet.</td></tr>}
          {items.map(q => (
            mirror
              ? <tr key={q.id}><td style={td}>{q.text}</td><td style={{ ...td, width: 80 }}>{q.scaleMax}</td><td style={{ ...td, width: 90, textAlign: "right", color: "var(--muted-foreground)" }}>—</td></tr>
              : <QuestionRow key={q.id} q={q} onSaved={refetch} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
      {!mirror && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input style={fi} placeholder="Add a question…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <button onClick={add} disabled={adding} style={{ ...ghostBtn, whiteSpace: "nowrap", opacity: adding ? 0.6 : 1 }}>
            {adding ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Plus size={14} />} Add
          </button>
        </div>
      )}
    </div>
  )
}

// ---- Section D: Global KPIs ----
function GlobalKpiRow({ k, onSaved, onDelete }: { k: GlobalKpi; onSaved: () => Promise<void>; onDelete: (k: GlobalKpi) => void }) {
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({ projectName: k.projectName, deliverable: k.deliverable, kpi: k.kpi, weight: k.weight })
  const [saving, setSaving] = useState(false)
  useEffect(() => { setF({ projectName: k.projectName, deliverable: k.deliverable, kpi: k.kpi, weight: k.weight }) }, [k])

  async function save() {
    setSaving(true)
    try {
      await jpatch(`/api/performance/global-kpis/${k.id}`, { projectName: f.projectName, deliverable: f.deliverable, kpi: f.kpi, weight: Number(f.weight) })
      setEditing(false)
      await onSaved()
    } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <tr>
        <td style={td}><input style={fi} value={f.projectName} onChange={e => setF({ ...f, projectName: e.target.value })} /></td>
        <td style={td}><input style={fi} value={f.deliverable} onChange={e => setF({ ...f, deliverable: e.target.value })} /></td>
        <td style={td}><input style={fi} value={f.kpi} onChange={e => setF({ ...f, kpi: e.target.value })} /></td>
        <td style={{ ...td, width: 80 }}><input type="number" style={fi} value={f.weight} onChange={e => setF({ ...f, weight: Number(e.target.value) })} /></td>
        <td style={{ ...td, width: 90, textAlign: "right" }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button onClick={save} disabled={saving} style={{ ...iconBtn, color: "var(--primary)" }}>{saving ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Check size={14} />}</button>
            <button onClick={() => setEditing(false)} style={iconBtn}><X size={14} /></button>
          </div>
        </td>
      </tr>
    )
  }
  return (
    <tr>
      <td style={td}>{k.projectName}</td>
      <td style={td}>{k.deliverable}</td>
      <td style={td}>{k.kpi}</td>
      <td style={{ ...td, width: 80 }}>{k.weight}</td>
      <td style={{ ...td, width: 90, textAlign: "right" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button onClick={() => setEditing(true)} style={iconBtn}><Pencil size={13} /></button>
          <button onClick={() => onDelete(k)} style={{ ...iconBtn, color: "#DC2626", borderColor: "rgba(220,38,38,0.4)" }}><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  )
}

function GlobalKpis({ cycle, refetch, onDelete }: { cycle: Cycle; refetch: () => Promise<void>; onDelete: (k: GlobalKpi) => void }) {
  const blank = { projectName: "", deliverable: "", kpi: "", weight: 0 }
  const [f, setF] = useState(blank)
  const [adding, setAdding] = useState(false)
  const items = [...cycle.globalKpis].sort((a, b) => a.order - b.order)

  async function add() {
    if (!f.projectName.trim()) return
    setAdding(true)
    try {
      await jpost("/api/performance/global-kpis", { cycleId: cycle.id, projectName: f.projectName, deliverable: f.deliverable, kpi: f.kpi, weight: Number(f.weight) })
      setF(blank)
      await refetch()
    } finally { setAdding(false) }
  }

  return (
    <SectionCard icon={<Target size={17} />} title="Job Specific KPIs" subtitle="Learning & Development, Brand and other org-wide KPIs.">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr><th style={th}>Project</th><th style={th}>Deliverable</th><th style={th}>KPI</th><th style={{ ...th, width: 80 }}>Weight</th><th style={{ ...th, width: 90, textAlign: "right" }}>Actions</th></tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td style={{ ...td, color: "var(--muted-foreground)" }} colSpan={5}>No global KPIs yet.</td></tr>}
          {items.map(k => <GlobalKpiRow key={k.id} k={k} onSaved={refetch} onDelete={onDelete} />)}
        </tbody>
      </table>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px auto", gap: 8, marginTop: 12, alignItems: "center" }}>
        <input style={fi} placeholder="Project" value={f.projectName} onChange={e => setF({ ...f, projectName: e.target.value })} />
        <input style={fi} placeholder="Deliverable" value={f.deliverable} onChange={e => setF({ ...f, deliverable: e.target.value })} />
        <input style={fi} placeholder="KPI" value={f.kpi} onChange={e => setF({ ...f, kpi: e.target.value })} />
        <input type="number" style={fi} placeholder="Wt" value={f.weight} onChange={e => setF({ ...f, weight: Number(e.target.value) })} />
        <button onClick={add} disabled={adding} style={{ ...ghostBtn, whiteSpace: "nowrap", opacity: adding ? 0.6 : 1 }}>
          {adding ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Plus size={14} />} Add
        </button>
      </div>
    </SectionCard>
  )
}

// ---- Section E: Bands ----
function BandsEditor({ cycle, refetch }: { cycle: Cycle; refetch: () => Promise<void> }) {
  const [queryText, setQueryText] = useState(JSON.stringify(cycle.queryBands ?? [], null, 2))
  const [recText, setRecText] = useState(JSON.stringify(cycle.recommendationBands ?? [], null, 2))
  const [savingQ, setSavingQ] = useState(false)
  const [savingR, setSavingR] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    setQueryText(JSON.stringify(cycle.queryBands ?? [], null, 2))
    setRecText(JSON.stringify(cycle.recommendationBands ?? [], null, 2))
  }, [cycle.queryBands, cycle.recommendationBands])

  async function saveBands(which: "queryBands" | "recommendationBands", raw: string, setSaving: (b: boolean) => void) {
    setErr(null)
    let parsed
    try { parsed = JSON.parse(raw) } catch { setErr(`Invalid JSON in ${which}.`); return }
    setSaving(true)
    try {
      await jpatch(`/api/performance/cycles/${cycle.id}`, { [which]: parsed })
      await refetch()
    } finally { setSaving(false) }
  }

  const ta: React.CSSProperties = { ...fi, fontFamily: "monospace", fontSize: 12, minHeight: 140, resize: "vertical" }

  return (
    <SectionCard icon={<Gavel size={17} />} title="Query & Recommendation bands" subtitle="Edit band definitions as JSON (label, points, and optional min/max).">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Query bands</h3>
            <button onClick={() => saveBands("queryBands", queryText, setSavingQ)} disabled={savingQ} style={{ ...ghostBtn, padding: "6px 12px", opacity: savingQ ? 0.6 : 1 }}>
              {savingQ && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />} Save
            </button>
          </div>
          <textarea style={ta} value={queryText} onChange={e => setQueryText(e.target.value)} spellCheck={false} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Recommendation bands</h3>
            <button onClick={() => saveBands("recommendationBands", recText, setSavingR)} disabled={savingR} style={{ ...ghostBtn, padding: "6px 12px", opacity: savingR ? 0.6 : 1 }}>
              {savingR && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />} Save
            </button>
          </div>
          <textarea style={ta} value={recText} onChange={e => setRecText(e.target.value)} spellCheck={false} />
        </div>
      </div>
      {err && <div style={{ marginTop: 10, fontSize: 12, color: "#DC2626" }}>{err}</div>}
    </SectionCard>
  )
}

// ---- CSV imports (projects, per-staff KPIs, leaderboard) ----
function CsvUploader({ title, desc, endpoint, sample, summarize, refetch }: {
  title: string
  desc: string
  endpoint: string
  sample: string
  summarize: (d: any) => string
  refetch: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true); setMsg(null); setErr(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(endpoint, { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error ?? "Upload failed"); return }
      setMsg(summarize(d))
      await refetch()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 6px" }}>{desc}</div>
      <code style={{ display: "block", fontSize: 11, color: "var(--muted-foreground)", background: "var(--muted)", padding: "6px 8px", borderRadius: 6, marginBottom: 10, overflowX: "auto" }}>{sample}</code>
      <label style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }}>
        {busy ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Upload size={14} />} {busy ? "Uploading…" : "Upload CSV"}
        <input type="file" accept=".csv" style={{ display: "none" }} disabled={busy}
          onChange={async e => { const f = e.target.files?.[0]; if (f) await upload(f); e.target.value = "" }} />
      </label>
      {msg && <div style={{ fontSize: 12, color: "var(--primary)", marginTop: 8 }}>{msg}</div>}
      {err && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{err}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ImportsCard({ cycle, refetch }: { cycle: Cycle; refetch: () => Promise<void> }) {
  return (
    <SectionCard icon={<FileStack size={17} />} title="CSV Imports"
      subtitle="Upload org data for this cycle. Projects drive peer matching; KPIs are assigned per staff; the leaderboard drives the admin-scored items (Brand, Learning, Attendance).">
      <CsvUploader
        title="Projects (peer-matching source)"
        desc="Project lead + team members. Members of the same project become each other's peer candidates. Run “Auto-assign peers” after uploading."
        endpoint="/api/performance/projects/import"
        sample="projectName,department,leadEmail,memberEmail"
        summarize={d => `Imported — ${d.projectsCreated} project(s) created, ${d.membersAdded} member(s) added${d.skipped?.length ? `, ${d.skipped.length} skipped` : ""}.`}
        refetch={refetch}
      />
      <CsvUploader
        title="Job-specific KPIs (per staff)"
        desc="Projects, deliverables, KPIs and weights assigned to each staff member. Replaces their existing staff KPI rows. Staff then self-score; reviewers score."
        endpoint={`/api/performance/cycles/${cycle.id}/import-kpis`}
        sample="email,projectName,deliverable,kpi,weight"
        summarize={d => `Imported for ${d.matched} staff${d.skipped?.length ? `, ${d.skipped.length} skipped` : ""}${d.warnings?.length ? `. ${d.warnings.length} weight warning(s).` : "."}`}
        refetch={refetch}
      />
      <CsvUploader
        title="Leaderboard (admin scores)"
        desc="Scores for Brand, Learning and Attendance. Drives each staff appraisal's admin scores and shows on the Leaderboards page so everyone can validate."
        endpoint={`/api/performance/cycles/${cycle.id}/import-leaderboard`}
        sample="email,category,score,note   (category = BRAND | LEARNING | ATTENDANCE)"
        summarize={d => `Imported ${d.matched} score(s)${d.skipped?.length ? `, ${d.skipped.length} skipped` : ""}.`}
        refetch={refetch}
      />
    </SectionCard>
  )
}

export default function CycleConfigPage() {
  const { id } = useParams<{ id: string }>()
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [loading, setLoading] = useState(true)
  const [delQ, setDelQ] = useState<Question | null>(null)
  const [delK, setDelK] = useState<GlobalKpi | null>(null)
  const [deleting, setDeleting] = useState(false)

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/performance/cycles/${id}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data) { console.error("Failed to load cycle", res.status); return }
    setCycle(data.cycle ?? null)
  }, [id])

  useEffect(() => {
    setLoading(true)
    refetch().finally(() => setLoading(false))
  }, [refetch])

  async function confirmDeleteQ() {
    if (!delQ) return
    setDeleting(true)
    try {
      await fetch(`/api/performance/questions/${delQ.id}`, { method: "DELETE" })
      setDelQ(null)
      await refetch()
    } finally { setDeleting(false) }
  }
  async function confirmDeleteK() {
    if (!delK) return
    setDeleting(true)
    try {
      await fetch(`/api/performance/global-kpis/${delK.id}`, { method: "DELETE" })
      setDelK(null)
      await refetch()
    } finally { setDeleting(false) }
  }

  if (loading) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)" }}>
        <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading cycle…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }
  if (!cycle) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
        <Link href="/admin/performance/cycles" style={{ ...ghostBtn, textDecoration: "none", marginBottom: 16 }}><ArrowLeft size={14} /> Back</Link>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Cycle not found.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <Link href="/admin/performance/cycles" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={14} /> Back to cycles
      </Link>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <ListChecks size={26} style={{ color: "var(--primary)", marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>{cycle.name}</h1>
            <span style={{ background: "rgba(34,197,94,0.15)", color: "var(--primary)", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{STAGE_LABELS[cycle.stage] ?? cycle.stage}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>H{cycle.half} {cycle.year} · {cycle._count?.appraisals ?? 0} appraisals · {cycle.peerCount} peers each</p>
        </div>
      </div>

      <StageControls cycle={cycle} refetch={refetch} />
      <ImportsCard cycle={cycle} refetch={refetch} />
      <WeightsEditor cycle={cycle} refetch={refetch} />

      <SectionCard icon={<ListChecks size={17} />} title="Questions" subtitle="Define rating questions per section.">
        {QUESTION_GROUPS.map(g => (
          <QuestionGroup key={g.section} cycle={cycle} section={g.section} label={g.label} scaleMax={g.scaleMax} refetch={refetch} onDelete={setDelQ} />
        ))}
      </SectionCard>

      <GlobalKpis cycle={cycle} refetch={refetch} onDelete={setDelK} />
      <BandsEditor cycle={cycle} refetch={refetch} />

      <ConfirmDialog
        open={!!delQ}
        onClose={() => setDelQ(null)}
        onConfirm={confirmDeleteQ}
        title="Delete question"
        body={<>Delete this question? This cannot be undone.</>}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
      <ConfirmDialog
        open={!!delK}
        onClose={() => setDelK(null)}
        onConfirm={confirmDeleteK}
        title="Delete global KPI"
        body={<>Delete <strong>{delK?.projectName}</strong>? This cannot be undone.</>}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
