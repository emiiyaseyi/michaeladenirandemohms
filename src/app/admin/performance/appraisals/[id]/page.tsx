"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import {
  ArrowLeft, Loader2, BarChart3, Target, Users, ShieldCheck,
  MessageSquare, CheckCircle2, RotateCcw, Pencil, Check, X,
} from "lucide-react"

const STAGE_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started", DRAFT: "Draft", SUBMITTED: "Submitted",
  LEAD_REVIEWING: "Team lead reviewing", LEAD_DONE: "Awaiting admin", FINALIZED: "Final result",
}

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
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, color: "var(--foreground)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }

type Person = { firstName: string; lastName: string; jobTitle?: string | null }
type Rating = { raterType: string; section: string; questionId: string | null; score: number | null; comment: string | null; raterId: string | null }
type Kpi = {
  id: string; projectName: string; deliverable: string | null; kpi: string | null; weight: number | null
  employeeScore: number | null; primaryScore: number | null; counterScore: number | null
  reviewerScore: number | null; reviewerComment: string | null; employeeComment: string | null; source: string
}
type Appraisal = {
  id: string; stage: string
  employee: Person
  cycle: { id: string; name: string; year: number; half: number; stage: string; weights?: Record<string, number> }
  ratings: Rating[]
  kpis: Kpi[]
  reviewers: { role: string; reviewer: Person }[]
  peers: { id: string; peerId: string; status: string; peer: Person }[]
  keyAchievements: string | null; areasForImprovement: string | null; developmentPlan: string | null
  employeeComments: string | null; reviewerComments: string | null; counterReviewerComments: string | null
  queryWarnings: number | null; queryBadges: number | null; queryEmployeeRating: number | null; queryHrRating: number | null; queryComment: string | null
  recCount: number | null; recEmployeeRating: number | null; recHrRating: number | null; recComment: string | null
  meetingEmployeeConfirmed: boolean | null; meetingReviewerConfirmed: boolean | null
  behavioural360Score: number | null
  jobScoreEmp: number | null; jobScoreRev: number | null
  coreScoreEmp: number | null; coreScoreRev: number | null
  finalEmployeePercent: number | null; finalReviewerPercent: number | null
  finalPercent: number | null; teamLeadPercent: number | null
  finalizedAt: string | null
}

const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}`)

function fullName(p?: Person | null) {
  if (!p) return "—"
  return `${p.firstName} ${p.lastName}`.trim() || "—"
}

function StageBadge({ stage }: { stage: string }) {
  return (
    <span style={{ background: "rgba(34,197,94,0.15)", color: "var(--primary)", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
      {STAGE_LABELS[stage] ?? stage}
    </span>
  )
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

function jpatch(url: string, body: unknown) {
  return fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
}
function jpost(url: string, body: unknown) {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
}

// ---- Overall Performance Summary ----
function SummaryCard({ a }: { a: Appraisal }) {
  const rows: { label: string; emp: number | null; rev: number | null; note?: string }[] = [
    { label: "360 Behavioural", emp: a.behavioural360Score, rev: a.behavioural360Score, note: "raw / 5" },
    { label: "Job-Specific", emp: a.jobScoreEmp, rev: a.jobScoreRev, note: "/ 100" },
    { label: "Core Values", emp: a.coreScoreEmp, rev: a.coreScoreRev },
    { label: "Recommendation", emp: a.recEmployeeRating, rev: a.recHrRating },
    { label: "Query", emp: a.queryEmployeeRating, rev: a.queryHrRating },
    { label: "Final", emp: a.finalEmployeePercent, rev: a.finalReviewerPercent },
  ]
  return (
    <SectionCard icon={<BarChart3 size={17} />} title="Overall Performance Summary">
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
        <thead>
          <tr>
            <th style={th}>Section</th>
            <th style={{ ...th, textAlign: "right" }}>Employee</th>
            <th style={{ ...th, textAlign: "right" }}>Reviewer</th>
            <th style={{ ...th, textAlign: "right" }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <td style={{ ...td, fontWeight: 700 }}>{r.label}</td>
              <td style={{ ...td, textAlign: "right" }}>{n(r.emp)}</td>
              <td style={{ ...td, textAlign: "right" }}>{n(r.rev)}</td>
              <td style={{ ...td, textAlign: "right", color: "var(--muted-foreground)", fontSize: 12 }}>{r.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" }}>
        <div style={{ flex: 1, minWidth: 200, background: "var(--primary)", borderRadius: 12, padding: "18px 22px", color: "white" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.9 }}>Final Score</div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{a.finalPercent ?? "—"}%</div>
        </div>
        {a.teamLeadPercent !== null && a.teamLeadPercent !== undefined && (
          <div style={{ flex: 1, minWidth: 200, background: "var(--muted)", borderRadius: 12, padding: "18px 22px", color: "var(--foreground)" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted-foreground)" }}>Team Leads Score</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{a.teamLeadPercent}%</div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ---- Job-Specific KPIs ----
function KpiNumCell({ value, editable, onSave }: { value: number | null; editable: boolean; onSave: (v: number | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value === null || value === undefined ? "" : String(value))
  const [saving, setSaving] = useState(false)
  useEffect(() => { setV(value === null || value === undefined ? "" : String(value)) }, [value])

  if (!editable) return <span>{n(value)}</span>
  if (!editing) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end", width: "100%" }}>
        {n(value)}
        <button onClick={() => setEditing(true)} style={{ ...iconBtn, padding: 3 }}><Pencil size={11} /></button>
      </span>
    )
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
      <input type="number" style={{ ...fi, width: 64, padding: "4px 6px" }} value={v} onChange={e => setV(e.target.value)} />
      <button disabled={saving} style={{ ...iconBtn, padding: 3, color: "var(--primary)" }}
        onClick={async () => {
          setSaving(true)
          try { await onSave(v === "" ? null : Number(v)); setEditing(false) } finally { setSaving(false) }
        }}>{saving ? <Loader2 size={11} style={{ animation: "spin .8s linear infinite" }} /> : <Check size={11} />}</button>
      <button onClick={() => { setEditing(false); setV(value === null ? "" : String(value)) }} style={{ ...iconBtn, padding: 3 }}><X size={11} /></button>
    </span>
  )
}

function KpisCard({ a, refetch }: { a: Appraisal; refetch: () => Promise<void> }) {
  const editable = a.cycle.stage === "REVIEW" || a.cycle.stage === "COMPILING"
  async function patchKpi(kpiId: string, field: string, value: number | null) {
    await jpatch(`/api/performance/appraisals/${a.id}/kpis/${kpiId}`, { [field]: value })
    await refetch()
  }
  return (
    <SectionCard icon={<Target size={17} />} title="Job-Specific KPIs"
      subtitle={editable ? "Editable: weight, employee score, primary/counter score. ADMIN-source rows (Learning & Dev, Brand) are filled here." : undefined}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Project</th>
              <th style={th}>Deliverable</th>
              <th style={th}>KPI</th>
              <th style={{ ...th, textAlign: "right" }}>Weight</th>
              <th style={{ ...th, textAlign: "right" }}>Emp</th>
              <th style={{ ...th, textAlign: "right" }}>Primary</th>
              <th style={{ ...th, textAlign: "right" }}>Counter</th>
              <th style={{ ...th, textAlign: "right" }}>Reviewer</th>
              <th style={th}>Source</th>
            </tr>
          </thead>
          <tbody>
            {a.kpis.length === 0 && <tr><td style={{ ...td, color: "var(--muted-foreground)" }} colSpan={9}>No KPIs.</td></tr>}
            {a.kpis.map(k => (
              <tr key={k.id}>
                <td style={{ ...td, fontWeight: 600 }}>{k.projectName}</td>
                <td style={td}>{k.deliverable ?? "—"}</td>
                <td style={td}>{k.kpi ?? "—"}</td>
                <td style={{ ...td, textAlign: "right" }}><KpiNumCell value={k.weight} editable={editable} onSave={v => patchKpi(k.id, "weight", v)} /></td>
                <td style={{ ...td, textAlign: "right" }}><KpiNumCell value={k.employeeScore} editable={editable} onSave={v => patchKpi(k.id, "employeeScore", v)} /></td>
                <td style={{ ...td, textAlign: "right" }}><KpiNumCell value={k.primaryScore} editable={editable} onSave={v => patchKpi(k.id, "primaryScore", v)} /></td>
                <td style={{ ...td, textAlign: "right" }}><KpiNumCell value={k.counterScore} editable={editable} onSave={v => patchKpi(k.id, "counterScore", v)} /></td>
                <td style={{ ...td, textAlign: "right" }}>{n(k.reviewerScore)}</td>
                <td style={td}>
                  <span style={{ background: k.source === "ADMIN" ? "rgba(99,102,241,0.15)" : "var(--muted)", color: k.source === "ADMIN" ? "#4F46E5" : "var(--muted-foreground)", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{k.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

// ---- 360 / Peer ratings ----
function RatingsCard({ a }: { a: Appraisal }) {
  const groups: { key: string; label: string }[] = [
    { key: "BEHAVIOURAL", label: "360 Behavioural (member upward)" },
    { key: "PEER", label: "Peer ratings" },
  ]
  return (
    <SectionCard icon={<Users size={17} />} title="360 / Peer ratings" subtitle="Admin view — rater identities are shown.">
      {groups.map(g => {
        const items = a.ratings.filter(r => r.section === g.key)
        const scored = items.filter(r => typeof r.score === "number")
        const avg = scored.length ? (scored.reduce((s, r) => s + (r.score as number), 0) / scored.length) : null
        return (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700 }}>{g.label}</h3>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{scored.length} rated · avg {avg === null ? "—" : avg.toFixed(2)}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Rater</th>
                  <th style={{ ...th, textAlign: "right" }}>Score</th>
                  <th style={th}>Comment</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td style={{ ...td, color: "var(--muted-foreground)" }} colSpan={3}>No ratings.</td></tr>}
                {items.map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{r.raterId ?? "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{n(r.score)}</td>
                    <td style={{ ...td, color: r.comment ? "var(--foreground)" : "var(--muted-foreground)" }}>{r.comment ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </SectionCard>
  )
}

// ---- Core Values ----
function CoreValuesCard({ a }: { a: Appraisal }) {
  const core = a.ratings.filter(r => r.section === "CORE_VALUE")
  const qids = Array.from(new Set(core.map(r => r.questionId)))
  const scoreFor = (qid: string | null, raterType: string) =>
    core.find(r => r.questionId === qid && r.raterType === raterType)?.score ?? null
  return (
    <SectionCard icon={<ShieldCheck size={17} />} title="Core Values">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Question</th>
            <th style={{ ...th, textAlign: "right" }}>Self</th>
            <th style={{ ...th, textAlign: "right" }}>Primary</th>
            <th style={{ ...th, textAlign: "right" }}>Counter</th>
          </tr>
        </thead>
        <tbody>
          {qids.length === 0 && <tr><td style={{ ...td, color: "var(--muted-foreground)" }} colSpan={4}>No core-value ratings.</td></tr>}
          {qids.map((qid, i) => (
            <tr key={qid ?? i}>
              <td style={td}>{qid ?? "—"}</td>
              <td style={{ ...td, textAlign: "right" }}>{n(scoreFor(qid, "SELF"))}</td>
              <td style={{ ...td, textAlign: "right" }}>{n(scoreFor(qid, "PRIMARY_REVIEWER"))}</td>
              <td style={{ ...td, textAlign: "right" }}>{n(scoreFor(qid, "COUNTER_REVIEWER"))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}

// ---- Improvement / Comments ----
const COMPILE_TEXT_FIELDS: { key: keyof Appraisal; label: string }[] = [
  { key: "keyAchievements", label: "Key achievements" },
  { key: "areasForImprovement", label: "Areas for improvement" },
  { key: "developmentPlan", label: "Development plan" },
  { key: "reviewerComments", label: "Reviewer comments" },
  { key: "counterReviewerComments", label: "Counter reviewer comments" },
]

function ReadField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>{value === null || value === undefined || value === "" ? "—" : value}</div>
    </div>
  )
}

function CommentsCard({ a, refetch }: { a: Appraisal; refetch: () => Promise<void> }) {
  const canEdit = a.cycle.stage === "COMPILING"
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [qHr, setQHr] = useState("")
  const [rHr, setRHr] = useState("")

  function start() {
    const f: Record<string, string> = {}
    for (const { key } of COMPILE_TEXT_FIELDS) f[key as string] = (a[key] as string | null) ?? ""
    setForm(f)
    setQHr(a.queryHrRating === null || a.queryHrRating === undefined ? "" : String(a.queryHrRating))
    setRHr(a.recHrRating === null || a.recHrRating === undefined ? "" : String(a.recHrRating))
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { ...form }
      payload.queryHrRating = qHr === "" ? null : Number(qHr)
      payload.recHrRating = rHr === "" ? null : Number(rHr)
      await jpatch(`/api/performance/appraisals/${a.id}`, payload)
      await refetch()
      setEditing(false)
    } finally { setSaving(false) }
  }

  const yesNo = (v: boolean | null) => (v === null || v === undefined ? "—" : v ? "Yes" : "No")
  const ta: React.CSSProperties = { ...fi, minHeight: 72, resize: "vertical" }

  return (
    <SectionCard icon={<MessageSquare size={17} />} title="Improvement / Comments">
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {COMPILE_TEXT_FIELDS.map(({ key, label }) => (
            <div key={key as string} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>{label}</label>
              <textarea style={ta} value={form[key as string] ?? ""} onChange={e => setForm({ ...form, [key as string]: e.target.value })} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Query HR rating</label>
              <input type="number" style={fi} value={qHr} onChange={e => setQHr(e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Recommendation HR rating</label>
              <input type="number" style={fi} value={rHr} onChange={e => setRHr(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEditing(false)} disabled={saving} style={ghostBtn}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
              {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />} Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {canEdit && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={start} style={ghostBtn}><Pencil size={13} /> Edit compile fields</button>
            </div>
          )}
          <ReadField label="Key achievements" value={a.keyAchievements} />
          <ReadField label="Areas for improvement" value={a.areasForImprovement} />
          <ReadField label="Development plan" value={a.developmentPlan} />
          <ReadField label="Employee comments" value={a.employeeComments} />
          <ReadField label="Reviewer comments" value={a.reviewerComments} />
          <ReadField label="Counter reviewer comments" value={a.counterReviewerComments} />
          <ReadField label="Query comment" value={a.queryComment} />
          <ReadField label="Recommendation comment" value={a.recComment} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginTop: 4 }}>
            <ReadField label="Query — Employee / HR" value={`${n(a.queryEmployeeRating)} / ${n(a.queryHrRating)}`} />
            <ReadField label="Recommendation — Employee / HR" value={`${n(a.recEmployeeRating)} / ${n(a.recHrRating)}`} />
            <ReadField label="Warnings / Badges" value={`${n(a.queryWarnings)} / ${n(a.queryBadges)}`} />
            <ReadField label="Meeting — Employee confirmed" value={yesNo(a.meetingEmployeeConfirmed)} />
            <ReadField label="Meeting — Reviewer confirmed" value={yesNo(a.meetingReviewerConfirmed)} />
          </div>
        </>
      )}
    </SectionCard>
  )
}

// ---- Action bar ----
function ActionBar({ a, refetch }: { a: Appraisal; refetch: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const canFinalize = a.cycle.stage === "COMPILING" && a.stage !== "FINALIZED"
  const isFinalized = a.stage === "FINALIZED"

  async function run(action: "finalize" | "reopen") {
    setBusy(true)
    try {
      await jpost(`/api/performance/appraisals/${a.id}/submit`, { action })
      await refetch()
    } finally { setBusy(false) }
  }

  if (!canFinalize && !isFinalized) return null

  return (
    <div style={{ position: "sticky", bottom: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      {isFinalized ? (
        <>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
            <CheckCircle2 size={16} /> Finalized {a.finalizedAt ? format(new Date(a.finalizedAt), "dd MMM yyyy, HH:mm") : ""}
          </span>
          <button onClick={() => run("reopen")} disabled={busy} style={{ ...ghostBtn, marginLeft: "auto", opacity: busy ? 0.6 : 1 }}>
            {busy ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <RotateCcw size={14} />} Reopen
          </button>
        </>
      ) : (
        <>
          <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Locks scores and snapshots the final result.</span>
          <button onClick={() => run("finalize")} disabled={busy} style={{ ...primaryBtn, marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, opacity: busy ? 0.6 : 1 }}>
            {busy ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <CheckCircle2 size={14} />} Finalize
          </button>
        </>
      )}
    </div>
  )
}

export default function AppraisalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [a, setA] = useState<Appraisal | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/performance/appraisals/${id}`)
    if (!res.ok) { setNotFound(true); return }
    const data = await res.json()
    setA(data.appraisal ?? null)
  }, [id])

  useEffect(() => {
    setLoading(true)
    refetch().finally(() => setLoading(false))
  }, [refetch])

  if (loading) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)" }}>
        <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading appraisal…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }
  if (notFound || !a) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
        <Link href="/admin/performance/appraisals" style={{ ...ghostBtn, textDecoration: "none", marginBottom: 16 }}><ArrowLeft size={14} /> Back</Link>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Appraisal not found.</p>
      </div>
    )
  }

  const primary = a.reviewers.find(r => r.role === "PRIMARY")?.reviewer
  const counter = a.reviewers.find(r => r.role === "COUNTER")?.reviewer

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <Link href="/admin/performance/appraisals" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={14} /> Back to appraisals
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <BarChart3 size={26} style={{ color: "var(--primary)", marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>{fullName(a.employee)}</h1>
            <StageBadge stage={a.stage} />
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
            {a.employee.jobTitle ?? "—"} · {a.cycle.name} · Primary: {fullName(primary)} · Counter: {fullName(counter)}
          </p>
        </div>
      </div>

      <SummaryCard a={a} />
      <KpisCard a={a} refetch={refetch} />
      <RatingsCard a={a} />
      <CoreValuesCard a={a} />
      <CommentsCard a={a} refetch={refetch} />
      <ActionBar a={a} refetch={refetch} />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
