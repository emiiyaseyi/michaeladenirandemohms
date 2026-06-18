"use client"

import { useEffect, useState, useCallback } from "react"
import { ClipboardList, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { ScaleLegend, validateRatings } from "@/components/performance/scale"

// ---------- types ----------
interface Question { id: string; section: string; text: string; scaleMax: number; order: number }
interface Cycle { id: string; name: string; year: number; half: number; stage: string; questions: Question[] }
interface Kpi {
  id: string
  projectName: string | null
  deliverable: string | null
  kpi: string | null
  weight: number | null
  employeeScore: number | null
  employeeComment: string | null
  evidenceUrl: string | null
  reviewerScore: number | null
  source: string
}
interface Rating { raterType: string; section: string; questionId: string; score: number | null; comment: string | null }
interface Appraisal {
  id: string
  stage: string
  kpis: Kpi[]
  ratings: Rating[]
  employee: { firstName: string; lastName: string; jobTitle: string | null }
  queryWarnings: number | null
  queryBadges: number | null
  queryEmployeeRating: number | null
  queryComment: string | null
  recCount: number | null
  recEmployeeRating: number | null
  recComment: string | null
  employeeComments: string | null
  meetingEmployeeConfirmed: boolean | null
  keyAchievements: string | null
  areasForImprovement: string | null
  developmentPlan: string | null
  reviewerComments: string | null
  counterReviewerComments: string | null
  finalPercent: number | null
  finalReviewerPercent: number | null
  teamLeadPercent: number | null
  behavioural360Score: number | null
  jobScoreRev: number | null
  coreScoreRev: number | null
  finalizedAt: string | null
}
interface MyData { cycle: Cycle | null; appraisal: Appraisal | null }

// ---------- shared styles ----------
const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}
const primaryBtn: React.CSSProperties = {
  padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8,
  cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white",
}
const card: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20,
}
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 4 }
const sectionSub: React.CSSProperties = { fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6, display: "block" }
const th: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", padding: "8px 6px", borderBottom: "1px solid var(--border)" }
const td: React.CSSProperties = { padding: "6px", verticalAlign: "top", borderBottom: "1px solid var(--border)" }

const STAGE_STEPS = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "LEAD_REVIEWING", label: "Team lead reviewing" },
  { key: "LEAD_DONE", label: "Awaiting admin" },
  { key: "FINALIZED", label: "Final result" },
]

export default function MyAppraisalPage() {
  const [data, setData] = useState<MyData | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    return fetch("/api/performance/my")
      .then(r => r.json())
      .then((d: MyData) => setData(d))
  }, [])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ClipboardList size={22} color="var(--primary)" />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>My Appraisal</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Complete your half-year self-assessment</p>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 24, color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</p>
      ) : !data?.cycle ? (
        <div style={{ ...card, marginTop: 24, color: "var(--muted-foreground)", fontSize: 14 }}>No active appraisal cycle.</div>
      ) : !data.appraisal ? (
        <div style={{ ...card, marginTop: 24, color: "var(--muted-foreground)", fontSize: 14 }}>
          Your appraisal hasn&apos;t been generated yet — contact HR.
        </div>
      ) : (
        <Body cycle={data.cycle} appraisal={data.appraisal} refetch={refetch} />
      )}
    </div>
  )
}

function Body({ cycle, appraisal, refetch }: { cycle: Cycle; appraisal: Appraisal; refetch: () => Promise<unknown> }) {
  const editable = cycle.stage === "OPEN" && (appraisal.stage === "NOT_STARTED" || appraisal.stage === "DRAFT")
  return editable
    ? <Editable cycle={cycle} appraisal={appraisal} refetch={refetch} />
    : <ReadOnly cycle={cycle} appraisal={appraisal} />
}

// =========================================================================
// EDITABLE
// =========================================================================
function Editable({ cycle, appraisal, refetch }: { cycle: Cycle; appraisal: Appraisal; refetch: () => Promise<unknown> }) {
  const aid = appraisal.id
  const emp = appraisal.employee

  // ---- helpers ----
  const patchKpi = (kpiId: string, field: string, value: unknown) =>
    fetch(`/api/performance/appraisals/${aid}/kpis/${kpiId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }),
    })

  const addKpi = async () => {
    await fetch(`/api/performance/appraisals/${aid}/kpis`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: "", deliverable: "", kpi: "", weight: 0 }),
    })
    await refetch()
  }
  const deleteKpi = async (kpiId: string) => {
    await fetch(`/api/performance/appraisals/${aid}/kpis/${kpiId}`, { method: "DELETE" })
    await refetch()
  }
  const uploadEvidence = async (kpiId: string, file: File): Promise<string | null> => {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch(`/api/performance/appraisals/${aid}/kpis/${kpiId}/evidence`, { method: "POST", body: fd })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { alert(d.error ?? "Upload failed"); return null }
    await refetch()
    return d.url ?? null
  }

  const patchAppraisal = (payload: Record<string, unknown>) =>
    fetch(`/api/performance/appraisals/${aid}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    })

  const totalWeight = appraisal.kpis.reduce((s, k) => s + (k.weight ?? 0), 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
      {/* Stage banner */}
      <div style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC", borderRadius: 12, padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>
        Open — complete and submit your appraisal
      </div>

      {/* 1. Employee Info */}
      <section style={card}>
        <div style={sectionTitle}>Employee Information</div>
        <div style={sectionSub}>Section I</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
          <Field label="Name" value={`${emp.firstName} ${emp.lastName}`} />
          <Field label="Job title" value={emp.jobTitle ?? "—"} />
          <Field label="Cycle" value={cycle.name} />
        </div>
      </section>

      {/* 2. Job-Specific Performance */}
      <section style={card}>
        <div style={sectionTitle}>Job-Specific Performance</div>
        <div style={sectionSub}>Section III — your projects, deliverables &amp; KPIs</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                <th style={th}>Project</th>
                <th style={th}>Deliverable</th>
                <th style={th}>KPI</th>
                <th style={{ ...th, width: 70 }}>Weight</th>
                <th style={{ ...th, width: 70 }}>Score 0–10</th>
                <th style={th}>Comment</th>
                <th style={th}>Evidence URL</th>
                <th style={{ ...th, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {appraisal.kpis.map(k => (
                <KpiRow key={k.id} kpi={k} patchKpi={patchKpi} deleteKpi={deleteKpi} refetch={refetch} uploadEvidence={uploadEvidence} />
              ))}
              {appraisal.kpis.length === 0 && (
                <tr><td style={{ ...td, color: "var(--muted-foreground)", fontSize: 13 }} colSpan={8}>No KPI rows yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
          <button onClick={addKpi} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Add KPI row
          </button>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            Total weight: {totalWeight}
            <span style={{ fontWeight: 500, color: "var(--muted-foreground)", marginLeft: 6 }}>(should total 100)</span>
          </div>
        </div>
      </section>

      {/* 3. Core Values */}
      <CoreValues cycle={cycle} appraisal={appraisal} aid={aid} refetch={refetch} />

      {/* 4. Query */}
      <QuerySection appraisal={appraisal} patchAppraisal={patchAppraisal} />

      {/* 5. Recommendations */}
      <RecommendationsSection appraisal={appraisal} patchAppraisal={patchAppraisal} />

      {/* 6. Comments & Meeting */}
      <CommentsSection appraisal={appraisal} patchAppraisal={patchAppraisal} />

      {/* Submit */}
      <SubmitBar aid={aid} refetch={refetch} />
    </div>
  )
}

function KpiRow({ kpi, patchKpi, deleteKpi, refetch, uploadEvidence }: {
  kpi: Kpi
  patchKpi: (id: string, field: string, value: unknown) => Promise<unknown>
  deleteKpi: (id: string) => Promise<unknown>
  refetch: () => Promise<unknown>
  uploadEvidence: (kpiId: string, file: File) => Promise<string | null>
}) {
  const admin = kpi.source === "ADMIN"

  const onBlurText = (field: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value
    void patchKpi(kpi.id, field, raw === "" ? null : raw)
  }
  const onBlurNum = (field: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value
    void patchKpi(kpi.id, field, raw === "" ? null : Number(raw))
  }

  if (admin) {
    return (
      <tr>
        <td style={td}><RoCell value={kpi.projectName} badge="Admin" /></td>
        <td style={td}><RoCell value={kpi.deliverable} /></td>
        <td style={td}><RoCell value={kpi.kpi} /></td>
        <td style={td}><RoCell value={kpi.weight} /></td>
        <td style={td}><RoCell value={kpi.employeeScore} /></td>
        <td style={td}><RoCell value={kpi.employeeComment} /></td>
        <td style={td}><RoCell value={kpi.evidenceUrl} /></td>
        <td style={td}></td>
      </tr>
    )
  }

  return (
    <tr>
      <td style={td}><input defaultValue={kpi.projectName ?? ""} onBlur={onBlurText("projectName")} style={fi} /></td>
      <td style={td}><input defaultValue={kpi.deliverable ?? ""} onBlur={onBlurText("deliverable")} style={fi} /></td>
      <td style={td}><input defaultValue={kpi.kpi ?? ""} onBlur={onBlurText("kpi")} style={fi} /></td>
      <td style={td}><input type="number" defaultValue={kpi.weight ?? ""} onBlur={onBlurNum("weight")} style={fi} /></td>
      <td style={td}><input type="number" min={0} max={10} defaultValue={kpi.employeeScore ?? ""} onBlur={onBlurNum("employeeScore")} style={fi} /></td>
      <td style={td}><input defaultValue={kpi.employeeComment ?? ""} onBlur={onBlurText("employeeComment")} style={fi} /></td>
      <td style={td}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {kpi.evidenceUrl && (
            <a href={kpi.evidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--primary)", textDecoration: "underline" }}>View file</a>
          )}
          <label style={{ fontSize: 11, color: "var(--muted-foreground)", cursor: "pointer", textDecoration: "underline" }}>
            {kpi.evidenceUrl ? "Replace" : "Upload"}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
              onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadEvidence(kpi.id, f); e.target.value = "" }} />
          </label>
        </div>
      </td>
      <td style={td}>
        <button
          onClick={async () => { await deleteKpi(kpi.id); await refetch() }}
          title="Delete row"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", padding: 6 }}
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  )
}

function RoCell({ value, badge }: { value: string | number | null; badge?: string }) {
  return (
    <div style={{ fontSize: 13, color: "var(--foreground)", padding: "9px 4px" }}>
      {badge && (
        <span style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, marginRight: 6 }}>{badge}</span>
      )}
      {value ?? "—"}
    </div>
  )
}

function CoreValues({ cycle, appraisal, aid, refetch }: { cycle: Cycle; appraisal: Appraisal; aid: string; refetch: () => Promise<unknown> }) {
  const questions = cycle.questions.filter(q => q.section === "CORE_VALUE").sort((a, b) => a.order - b.order)
  const initial: Record<string, { score: number | null; comment: string }> = {}
  for (const q of questions) {
    const r = appraisal.ratings.find(x => x.raterType === "SELF" && x.section === "CORE_VALUE" && x.questionId === q.id)
    initial[q.id] = { score: r?.score ?? null, comment: r?.comment ?? "" }
  }
  const [state, setState] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const rows = questions.map(q => ({ score: state[q.id].score, comment: state[q.id].comment }))
    const v = validateRatings(rows)
    if (v) { setErr(v); setSaved(false); return }
    setErr(null); setSaving(true); setSaved(false)
    await fetch(`/api/performance/appraisals/${aid}/ratings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "CORE_VALUE", raterType: "SELF",
        ratings: questions.map(q => ({ questionId: q.id, score: state[q.id].score, comment: state[q.id].comment.trim() })),
      }),
    })
    await refetch()
    setSaving(false); setSaved(true)
  }

  if (questions.length === 0) return null

  return (
    <section style={card}>
      <div style={sectionTitle}>Organisation Core Values</div>
      <div style={sectionSub}>Section IV — rate yourself on each value. A comment is required for every value.</div>
      <ScaleLegend scaleMax={questions[0]?.scaleMax ?? 3} />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {questions.map(q => (
          <div key={q.id}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{q.text}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {Array.from({ length: q.scaleMax + 1 }, (_, i) => i).map(n => {
                const active = state[q.id].score === n
                return (
                  <button
                    key={n}
                    onClick={() => setState(s => ({ ...s, [q.id]: { ...s[q.id], score: n } }))}
                    style={{
                      minWidth: 38, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
                      border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                      background: active ? "var(--primary)" : "var(--background)",
                      color: active ? "white" : "var(--foreground)",
                    }}
                  >{n}</button>
                )
              })}
            </div>
            <input
              placeholder="Comment (required)"
              value={state[q.id].comment}
              onChange={e => setState(s => ({ ...s, [q.id]: { ...s[q.id], comment: e.target.value } }))}
              style={fi}
            />
          </div>
        ))}
      </div>
      {err && <div style={{ marginTop: 12, fontSize: 12, color: "#EF4444" }}>{err}</div>}
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
          {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
          Save core values
        </button>
        {saved && !saving && <span style={{ fontSize: 12, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14} /> Saved</span>}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </section>
  )
}

function NumField({ label, defaultValue, onCommit }: { label: string; defaultValue: number | null; onCommit: (v: number | null) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        defaultValue={defaultValue ?? ""}
        onBlur={e => onCommit(e.target.value === "" ? null : Number(e.target.value))}
        style={fi}
      />
    </div>
  )
}

function SaveRow({ onSave }: { onSave: () => Promise<unknown> }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  return (
    <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <button
        onClick={async () => { setSaving(true); setSaved(false); await onSave(); setSaving(false); setSaved(true) }}
        disabled={saving}
        style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}
      >
        {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
        Save
      </button>
      {saved && !saving && <span style={{ fontSize: 12, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14} /> Saved</span>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function QuerySection({ appraisal, patchAppraisal }: { appraisal: Appraisal; patchAppraisal: (p: Record<string, unknown>) => Promise<unknown> }) {
  const [warnings, setWarnings] = useState(appraisal.queryWarnings)
  const [badges, setBadges] = useState(appraisal.queryBadges)
  const [rating, setRating] = useState(appraisal.queryEmployeeRating)
  const [comment, setComment] = useState(appraisal.queryComment ?? "")
  return (
    <section style={card}>
      <div style={sectionTitle}>Query</div>
      <div style={sectionSub}>Section V</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
        <NumField label="Warnings" defaultValue={warnings} onCommit={setWarnings} />
        <NumField label="Badges" defaultValue={badges} onCommit={setBadges} />
        <NumField label="Your query points (self)" defaultValue={rating} onCommit={setRating} />
      </div>
      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Comment</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} style={{ ...fi, resize: "vertical" }} />
      </div>
      <SaveRow onSave={() => patchAppraisal({ queryWarnings: warnings, queryBadges: badges, queryEmployeeRating: rating, queryComment: comment || null })} />
    </section>
  )
}

function RecommendationsSection({ appraisal, patchAppraisal }: { appraisal: Appraisal; patchAppraisal: (p: Record<string, unknown>) => Promise<unknown> }) {
  const [count, setCount] = useState(appraisal.recCount)
  const [rating, setRating] = useState(appraisal.recEmployeeRating)
  const [comment, setComment] = useState(appraisal.recComment ?? "")
  return (
    <section style={card}>
      <div style={sectionTitle}>Recommendations</div>
      <div style={sectionSub}>Section VI</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
        <NumField label="Recommendation count" defaultValue={count} onCommit={setCount} />
        <NumField label="Your recommendation points (self)" defaultValue={rating} onCommit={setRating} />
      </div>
      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Comment</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} style={{ ...fi, resize: "vertical" }} />
      </div>
      <SaveRow onSave={() => patchAppraisal({ recCount: count, recEmployeeRating: rating, recComment: comment || null })} />
    </section>
  )
}

function CommentsSection({ appraisal, patchAppraisal }: { appraisal: Appraisal; patchAppraisal: (p: Record<string, unknown>) => Promise<unknown> }) {
  const [comments, setComments] = useState(appraisal.employeeComments ?? "")
  const [confirmed, setConfirmed] = useState(!!appraisal.meetingEmployeeConfirmed)
  return (
    <section style={card}>
      <div style={sectionTitle}>Comments &amp; Meeting</div>
      <div style={sectionSub}>Section VII</div>
      <div>
        <label style={labelStyle}>Your comments</label>
        <textarea value={comments} onChange={e => setComments(e.target.value)} rows={4} style={{ ...fi, resize: "vertical" }} />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, cursor: "pointer" }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        I confirm a one-on-one review meeting was/will be held
      </label>
      <SaveRow onSave={() => patchAppraisal({ employeeComments: comments || null, meetingEmployeeConfirmed: confirmed })} />
    </section>
  )
}

function SubmitBar({ aid, refetch }: { aid: string; refetch: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    setLoading(true)
    await fetch(`/api/performance/appraisals/${aid}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "employeeSubmit" }),
    })
    await refetch()
    setLoading(false)
    setOpen(false)
  }
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <button onClick={() => setOpen(true)} style={primaryBtn}>Submit appraisal</button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={submit}
        title="Submit appraisal"
        body="Once submitted, your appraisal becomes read-only and is sent to your team lead for review. Make sure all sections are saved first."
        confirmText="Submit"
        variant="primary"
        loading={loading}
      />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

// =========================================================================
// READ-ONLY
// =========================================================================
function ReadOnly({ cycle, appraisal }: { cycle: Cycle; appraisal: Appraisal }) {
  const emp = appraisal.employee
  const currentIdx = STAGE_STEPS.findIndex(s => s.key === appraisal.stage)
  const finalized = appraisal.stage === "FINALIZED"
  const coreQuestions = cycle.questions.filter(q => q.section === "CORE_VALUE").sort((a, b) => a.order - b.order)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
      {/* Stage tracker */}
      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          {STAGE_STEPS.map((step, i) => {
            const done = currentIdx >= 0 && i <= currentIdx
            const active = i === currentIdx
            return (
              <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    background: done ? "var(--primary)" : "var(--muted)",
                    color: done ? "white" : "var(--muted-foreground)",
                    border: active ? "2px solid var(--primary)" : "none",
                  }}>{done ? <CheckCircle2 size={15} /> : i + 1}</div>
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: done ? "var(--foreground)" : "var(--muted-foreground)" }}>{step.label}</span>
                </div>
                {i < STAGE_STEPS.length - 1 && (
                  <div style={{ width: 28, height: 2, background: currentIdx > i ? "var(--primary)" : "var(--border)", margin: "0 4px" }} />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Final result */}
      {finalized && (
        <section style={{ ...card, borderColor: "var(--primary)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Final Result</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: "var(--primary)", marginTop: 4 }}>{appraisal.finalPercent ?? "—"}%</div>
          {appraisal.teamLeadPercent != null && (
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>Team Lead Score {appraisal.teamLeadPercent}%</div>
          )}
          {appraisal.finalizedAt && (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Finalized {format(new Date(appraisal.finalizedAt), "MMM d, yyyy")}</div>
          )}
          {(appraisal.reviewerComments || appraisal.areasForImprovement || appraisal.developmentPlan) && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <RoText label="Reviewer comments" value={appraisal.reviewerComments} />
              <RoText label="Areas for improvement" value={appraisal.areasForImprovement} />
              <RoText label="Development plan" value={appraisal.developmentPlan} />
            </div>
          )}
        </section>
      )}

      {/* Employee info */}
      <section style={card}>
        <div style={sectionTitle}>Employee Information</div>
        <div style={sectionSub}>Section I</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
          <Field label="Name" value={`${emp.firstName} ${emp.lastName}`} />
          <Field label="Job title" value={emp.jobTitle ?? "—"} />
          <Field label="Cycle" value={cycle.name} />
        </div>
      </section>

      {/* Job-specific performance */}
      <section style={card}>
        <div style={sectionTitle}>Job-Specific Performance</div>
        <div style={sectionSub}>Section III</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={th}>Project</th>
                <th style={th}>Deliverable</th>
                <th style={th}>KPI</th>
                <th style={{ ...th, width: 70 }}>Weight</th>
                <th style={{ ...th, width: 90 }}>Your score</th>
                <th style={{ ...th, width: 90 }}>Reviewer</th>
                <th style={th}>Comment</th>
              </tr>
            </thead>
            <tbody>
              {appraisal.kpis.map(k => (
                <tr key={k.id}>
                  <td style={td}><RoCell value={k.projectName} badge={k.source === "ADMIN" ? "Admin" : undefined} /></td>
                  <td style={td}><RoCell value={k.deliverable} /></td>
                  <td style={td}><RoCell value={k.kpi} /></td>
                  <td style={td}><RoCell value={k.weight} /></td>
                  <td style={td}><RoCell value={k.employeeScore} /></td>
                  <td style={td}><RoCell value={k.reviewerScore} /></td>
                  <td style={td}><RoCell value={k.employeeComment} /></td>
                </tr>
              ))}
              {appraisal.kpis.length === 0 && (
                <tr><td style={{ ...td, color: "var(--muted-foreground)", fontSize: 13 }} colSpan={7}>No KPI rows.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Core values */}
      {coreQuestions.length > 0 && (
        <section style={card}>
          <div style={sectionTitle}>Organisation Core Values</div>
          <div style={sectionSub}>Section IV</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {coreQuestions.map(q => {
              const r = appraisal.ratings.find(x => x.raterType === "SELF" && x.section === "CORE_VALUE" && x.questionId === q.id)
              return (
                <div key={q.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{q.text}</div>
                    {r?.comment && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{r.comment}</div>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>{r?.score ?? "—"} / {q.scaleMax}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Query */}
      <section style={card}>
        <div style={sectionTitle}>Query</div>
        <div style={sectionSub}>Section V</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16 }}>
          <Field label="Warnings" value={String(appraisal.queryWarnings ?? "—")} />
          <Field label="Badges" value={String(appraisal.queryBadges ?? "—")} />
          <Field label="Your query points" value={String(appraisal.queryEmployeeRating ?? "—")} />
        </div>
        {appraisal.queryComment && <div style={{ marginTop: 12 }}><RoText label="Comment" value={appraisal.queryComment} /></div>}
      </section>

      {/* Recommendations */}
      <section style={card}>
        <div style={sectionTitle}>Recommendations</div>
        <div style={sectionSub}>Section VI</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16 }}>
          <Field label="Recommendation count" value={String(appraisal.recCount ?? "—")} />
          <Field label="Your recommendation points" value={String(appraisal.recEmployeeRating ?? "—")} />
        </div>
        {appraisal.recComment && <div style={{ marginTop: 12 }}><RoText label="Comment" value={appraisal.recComment} /></div>}
      </section>

      {/* Comments & meeting */}
      <section style={card}>
        <div style={sectionTitle}>Comments &amp; Meeting</div>
        <div style={sectionSub}>Section VII</div>
        <RoText label="Your comments" value={appraisal.employeeComments} />
        <div style={{ marginTop: 12, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={15} color={appraisal.meetingEmployeeConfirmed ? "var(--primary)" : "var(--muted-foreground)"} />
          {appraisal.meetingEmployeeConfirmed ? "One-on-one review meeting confirmed" : "Meeting not confirmed"}
        </div>
      </section>
    </div>
  )
}

function RoText({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value ?? "—"}</div>
    </div>
  )
}
