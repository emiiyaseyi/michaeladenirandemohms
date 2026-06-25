"use client"

import { useEffect, useState, useCallback } from "react"
import { ClipboardList, Loader2, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { ScaleLegend, validateRatings } from "@/components/performance/scale"
import { queryPoints, recommendationPoints } from "@/lib/appraisal-scoring"
import { DEFAULT_QUERY_BANDS, DEFAULT_RECOMMENDATION_BANDS, DEFAULT_WEIGHTS, SMART_GUIDANCE } from "@/lib/appraisal-defaults"

// ---------- types ----------
interface Question { id: string; section: string; text: string; scaleMax: number; order: number; adminScored?: boolean }
interface QueryBand { label: string; warnings?: number; badges?: number; points: number }
interface RecBand { label: string; min: number; max: number; points: number }
interface Weights { behavioural: number; jobSpecific: number; coreValues: number; recommendation: number; query: number }
interface Cycle { id: string; name: string; year: number; half: number; stage: string; questions: Question[]; queryBands?: QueryBand[] | null; recommendationBands?: RecBand[] | null; weights?: Weights | null }
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
  employeeImprovementPlan: string | null
  meetingEmployeeConfirmed: boolean | null
  keyAchievements: string | null
  areasForImprovement: string | null
  developmentPlan: string | null
  reviewerComments: string | null
  counterReviewerComments: string | null
  managementComment: string | null
  finalPercent: number | null
  finalEmployeePercent: number | null
  finalReviewerPercent: number | null
  teamLeadPercent: number | null
  teamLeadReviewSummary: string | null
  teamLeadReviewSummaryAt: string | null
  teamLeadReviewCount: number | null
  behavioural360Score: number | null
  behavioural360Emp: number | null
  behavioural360Rev: number | null
  jobScoreEmp: number | null
  jobScoreRev: number | null
  coreScoreEmp: number | null
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
  // KPI rows are admin-assigned (uploaded by HR). Staff edit only score / comment / evidence link.
  const patchKpi = (kpiId: string, field: string, value: unknown) =>
    fetch(`/api/performance/appraisals/${aid}/kpis/${kpiId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }),
    })

  const patchAppraisal = (payload: Record<string, unknown>) =>
    fetch(`/api/performance/appraisals/${aid}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    })

  // Weights are fixed by HR — informational total only.
  const totalWeight = appraisal.kpis.reduce((s, k) => s + (Number(k.weight) || 0), 0)

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

      {/* 2. Behavioural self-assessment (Section II) */}
      <SelfRatingSection cycle={cycle} appraisal={appraisal} aid={aid} refetch={refetch}
        section="BEHAVIOURAL" title="Behavioural Self-Assessment"
        sub="Section II — rate yourself on each behavioural area. Your team lead and peers rate you separately. A comment is required for every item." />

      {/* 3. Job-Specific Performance */}
      <section style={card}>
        <div style={sectionTitle}>Job-Specific Performance</div>
        <div style={sectionSub}>Section III — projects, deliverables &amp; KPIs assigned by HR. Score yourself, comment, and add an evidence link for each.</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                <th style={th}>Project</th>
                <th style={th}>Deliverable</th>
                <th style={th}>KPI</th>
                <th style={{ ...th, width: 70 }}>Weight</th>
                <th style={{ ...th, width: 90 }}>Score (/ weight)</th>
                <th style={th}>Comment</th>
                <th style={th}>Evidence link</th>
              </tr>
            </thead>
            <tbody>
              {appraisal.kpis.map(k => (
                <KpiRow key={k.id} kpi={k} patchKpi={patchKpi} />
              ))}
              {appraisal.kpis.length === 0 && (
                <tr><td style={{ ...td, color: "var(--muted-foreground)", fontSize: 13 }} colSpan={7}>No projects assigned yet — HR will upload your KPIs for this cycle.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
            Total weight: {totalWeight} / 100
            <span style={{ fontWeight: 500, color: "var(--muted-foreground)", marginLeft: 6 }}>(set by HR)</span>
          </div>
        </div>
        <SaveRow onSave={() => refetch()} />
      </section>

      {/* 4. Core Values */}
      <SelfRatingSection cycle={cycle} appraisal={appraisal} aid={aid} refetch={refetch}
        section="CORE_VALUE" title="Organisation Core Values"
        sub="Section IV — rate yourself on each value. A comment is required for every value." />

      {/* 4. Query */}
      <QuerySection appraisal={appraisal} patchAppraisal={patchAppraisal} cycle={cycle} />

      {/* 5. Recommendations */}
      <RecommendationsSection appraisal={appraisal} patchAppraisal={patchAppraisal} cycle={cycle} />

      {/* 6. Comments & Meeting */}
      <CommentsSection appraisal={appraisal} patchAppraisal={patchAppraisal} />

      {/* Your live scores */}
      <ScoreSummary a={appraisal} cycle={cycle} />

      {/* Submit */}
      <SubmitBar aid={aid} refetch={refetch} />
    </div>
  )
}

function KpiRow({ kpi, patchKpi }: {
  kpi: Kpi
  patchKpi: (id: string, field: string, value: unknown) => Promise<unknown>
}) {
  // ADMIN-source rows (Brand, L&D) are fully read-only to staff; their score comes from the leaderboard.
  const admin = kpi.source === "ADMIN"
  const weightVal = Number(kpi.weight) || 0

  const onBlurText = (field: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value
    void patchKpi(kpi.id, field, raw.trim() === "" ? null : raw.trim())
  }

  return (
    <tr>
      <td style={td}><RoCell value={kpi.projectName} badge={admin ? "Admin" : undefined} /></td>
      <td style={td}><RoCell value={kpi.deliverable} /></td>
      <td style={td}><RoCell value={kpi.kpi} /></td>
      <td style={td}><RoCell value={kpi.weight} /></td>
      <td style={td}>
        {admin ? <RoCell value={kpi.employeeScore} /> : (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="number" min={0} max={weightVal} defaultValue={kpi.employeeScore ?? ""} onBlur={e => { const raw = e.target.value; const v = raw === "" ? null : Math.max(0, Math.min(weightVal, Number(raw))); if (v !== null) e.target.value = String(v); void patchKpi(kpi.id, "employeeScore", v) }} style={{ ...fi, width: 56 }} />
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/ {weightVal}</span>
          </div>
        )}
      </td>
      <td style={td}>{admin ? <RoCell value={kpi.employeeComment} /> : <input defaultValue={kpi.employeeComment ?? ""} onBlur={onBlurText("employeeComment")} style={fi} />}</td>
      <td style={td}>
        {admin ? (
          kpi.evidenceUrl
            ? <a href={kpi.evidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "underline" }}>Open link</a>
            : <RoCell value={null} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <input defaultValue={kpi.evidenceUrl ?? ""} onBlur={onBlurText("evidenceUrl")} placeholder="https://…" style={fi} />
            {kpi.evidenceUrl && (
              <a href={kpi.evidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--primary)", textDecoration: "underline" }}>Open link</a>
            )}
          </div>
        )}
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

function SelfRatingSection({ cycle, appraisal, aid, refetch, section, title, sub }: {
  cycle: Cycle; appraisal: Appraisal; aid: string; refetch: () => Promise<unknown>
  section: "BEHAVIOURAL" | "CORE_VALUE"; title: string; sub: string
}) {
  const questions = cycle.questions.filter(q => q.section === section).sort((a, b) => a.order - b.order)
  const initial: Record<string, { score: number | null; comment: string }> = {}
  for (const q of questions) {
    const r = appraisal.ratings.find(x => x.raterType === "SELF" && x.section === section && x.questionId === q.id)
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
        section, raterType: "SELF",
        ratings: questions.map(q => ({ questionId: q.id, score: state[q.id].score, comment: state[q.id].comment.trim() })),
      }),
    })
    await refetch()
    setSaving(false); setSaved(true)
  }

  if (questions.length === 0) return null

  return (
    <section style={card}>
      <div style={sectionTitle}>{title}</div>
      <div style={sectionSub}>{sub}</div>
      <ScaleLegend scaleMax={questions[0]?.scaleMax ?? 3} />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {questions.map(q => (
          <div key={q.id}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{q.text}</div>
            {q.adminScored && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>HR also records an official score for this item.</div>}
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
          {section === "BEHAVIOURAL" ? "Save Behavioural section" : "Save core values"}
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

function fmt(v: number | null | undefined, suffix = "") { return v == null ? "—" : `${v}${suffix}` }

function r1(v: number) { return Math.round(v * 10) / 10 }

// Anonymous synthesis of upward (team-member) feedback for a lead. Raw reviews are sealed;
// only this AI summary is shown, and only once >= 3 members have submitted.
function TeamLeadFeedback({ a }: { a: Appraisal }) {
  const count = a.teamLeadReviewCount
  if (count === null || count === undefined || count === 0) return null // not a lead / no upward reviews
  const MIN = 3
  return (
    <section style={card}>
      <div style={sectionTitle}>Your Team&apos;s Upward Feedback</div>
      <div style={sectionSub}>Anonymous summary from your team members. Individual reviews are never shown to anyone — only this synthesis.</div>
      {count < MIN ? (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Held for anonymity — a summary appears once at least {MIN} of your team members have submitted (currently {count}).
        </p>
      ) : a.teamLeadReviewSummary ? (
        <>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 10 }}>
            Based on {count} anonymous reviews{a.teamLeadPercent != null ? ` · overall upward score ${Math.round(a.teamLeadPercent)}%` : ""}
          </div>
          <MiniMarkdown text={a.teamLeadReviewSummary} />
        </>
      ) : (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Your team&apos;s feedback summary is being prepared and will appear here shortly.</p>
      )}
    </section>
  )
}

function MiniMarkdown({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--foreground)" }}>
      {text.split(/\r?\n/).map((ln, i) => {
        const t = ln.trim()
        if (!t) return <div key={i} style={{ height: 8 }} />
        if (t.startsWith("## ")) return <div key={i} style={{ fontWeight: 800, fontSize: 13.5, marginTop: 10, marginBottom: 2 }}>{t.slice(3)}</div>
        if (t.startsWith("# ")) return <div key={i} style={{ fontWeight: 800, fontSize: 14, marginTop: 10 }}>{t.slice(2)}</div>
        if (t.startsWith("- ") || t.startsWith("* ")) return <div key={i} style={{ paddingLeft: 14 }}>• {t.slice(2)}</div>
        return <div key={i}>{t}</div>
      })}
    </div>
  )
}

// Live "Overall Performance Summary" for the subject — their own (Employee) column.
// Shows each section's WEIGHTED contribution (raw ÷ max × weight) which sum to the
// overall %. Mirrors the official appraisal summary. Refreshes on each save.
function ScoreSummary({ a, cycle }: { a: Appraisal; cycle: Cycle }) {
  const finalized = a.finalizedAt != null
  const w = cycle.weights ?? DEFAULT_WEIGHTS
  const coreCount = cycle.questions.filter(q => q.section === "CORE_VALUE").length
  const behCount = cycle.questions.filter(q => q.section === "BEHAVIOURAL").length
  const coreMax = (coreCount || 8) * 3
  const behMax = (behCount || 7) * 5

  const behRaw = a.behavioural360Emp ?? 0                 // 0–5 mean
  const behW = (behRaw / 5) * w.behavioural
  const jobRaw = Math.min(100, a.jobScoreEmp ?? 0)         // 0–100 (clamp legacy overshoot)
  const jobW = (jobRaw / 100) * w.jobSpecific
  const coreRaw = a.coreScoreEmp ?? 0                      // 0–coreMax
  const coreW = coreMax ? (coreRaw / coreMax) * w.coreValues : 0
  const recW = a.recEmployeeRating ?? 0                    // already 0..weight
  const queryW = a.queryEmployeeRating ?? 0                // negative points

  const rows = [
    { label: "360 Behavioural", raw: `${r1(behRaw)} / 5`, weight: w.behavioural, weighted: behW },
    { label: "Job-Specific", raw: `${r1(jobRaw)} / 100`, weight: w.jobSpecific, weighted: jobW },
    { label: "Organisation Core Values", raw: `${r1(coreRaw)} / ${coreMax}`, weight: w.coreValues, weighted: coreW },
    { label: "Recommendation", raw: `${a.recCount ?? 0} rec(s)`, weight: w.recommendation, weighted: recW },
    { label: "Query", raw: `pts`, weight: w.query, weighted: queryW },
  ]

  const th: React.CSSProperties = { padding: "8px 6px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }
  const tdc: React.CSSProperties = { padding: "8px 6px", textAlign: "right", fontWeight: 700 }

  return (
    <section style={card}>
      <div style={sectionTitle}>Your Scores</div>
      <div style={sectionSub}>Weighted contribution per section — these add up to your overall score. Updates each time you save.</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--muted)" }}>
              <th style={{ ...th, textAlign: "left" }}>Section</th>
              <th style={th}>Your raw</th>
              <th style={th}>Weight</th>
              <th style={th}>Weighted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(rw => (
              <tr key={rw.label} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 6px", color: "var(--foreground)" }}>{rw.label}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--muted-foreground)" }}>{rw.raw}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--muted-foreground)" }}>{rw.weight}</td>
                <td style={tdc}>{r1(rw.weighted)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Your overall (self) score:</span>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{fmt(a.finalEmployeePercent, "%")}</span>
      </div>
      {finalized && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 24 }}>
          <div><div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Final appraisal score</div><div style={{ fontSize: 24, fontWeight: 800 }}>{fmt(a.finalPercent, "%")}</div></div>
          {a.teamLeadPercent != null && <div><div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Team Lead Score</div><div style={{ fontSize: 24, fontWeight: 800 }}>{fmt(a.teamLeadPercent, "%")}</div></div>}
        </div>
      )}
    </section>
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

function BandScale({ title, rows }: { title: string; rows: { label: string; points: number }[] }) {
  return (
    <div style={{ fontSize: 12, color: "var(--muted-foreground)", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
      <strong style={{ color: "var(--foreground)" }}>{title}</strong>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>{r.label}</span><span style={{ fontWeight: 700, color: "var(--foreground)" }}>{r.points > 0 ? `+${r.points}` : r.points}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function numOr0(v: number | null | undefined) { return typeof v === "number" ? v : 0 }

function QuerySection({ appraisal, patchAppraisal, cycle }: { appraisal: Appraisal; patchAppraisal: (p: Record<string, unknown>) => Promise<unknown>; cycle: Cycle }) {
  const bands = (cycle.queryBands && cycle.queryBands.length ? cycle.queryBands : DEFAULT_QUERY_BANDS) as any
  const [warnings, setWarnings] = useState(numOr0(appraisal.queryWarnings))
  const [badges, setBadges] = useState(numOr0(appraisal.queryBadges))
  const [comment, setComment] = useState(appraisal.queryComment ?? "")
  const points = queryPoints(bands, warnings, badges)
  const numInput: React.CSSProperties = { ...fi }
  return (
    <section style={card}>
      <div style={sectionTitle}>Query</div>
      <div style={sectionSub}>Section V — enter your counts; points are calculated automatically.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
        <div>
          <label style={labelStyle}>How many warnings do you have?</label>
          <input type="number" min={0} value={warnings} onChange={e => setWarnings(e.target.value === "" ? 0 : Number(e.target.value))} style={numInput} />
        </div>
        <div>
          <label style={labelStyle}>How many official query badges do you have?</label>
          <input type="number" min={0} value={badges} onChange={e => setBadges(e.target.value === "" ? 0 : Number(e.target.value))} style={numInput} />
        </div>
        <div>
          <label style={labelStyle}>Query points (auto)</label>
          <div style={{ fontSize: 22, fontWeight: 800, color: points < 0 ? "#EF4444" : "var(--foreground)" }}>{points}</div>
        </div>
      </div>
      <BandScale title="Scale — points deducted" rows={bands.map((b: any) => ({ label: b.label, points: b.points }))} />
      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Comment</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} style={{ ...fi, resize: "vertical" }} />
      </div>
      <SaveRow onSave={() => patchAppraisal({ queryWarnings: warnings, queryBadges: badges, queryComment: comment || null })} />
    </section>
  )
}

function RecommendationsSection({ appraisal, patchAppraisal, cycle }: { appraisal: Appraisal; patchAppraisal: (p: Record<string, unknown>) => Promise<unknown>; cycle: Cycle }) {
  const bands = (cycle.recommendationBands && cycle.recommendationBands.length ? cycle.recommendationBands : DEFAULT_RECOMMENDATION_BANDS) as any
  const [count, setCount] = useState(numOr0(appraisal.recCount))
  const [comment, setComment] = useState(appraisal.recComment ?? "")
  const points = recommendationPoints(bands, count)
  return (
    <section style={card}>
      <div style={sectionTitle}>Recommendations</div>
      <div style={sectionSub}>Section VI — enter your count; points are calculated automatically.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
        <div>
          <label style={labelStyle}>How many recommendations do you have?</label>
          <input type="number" min={0} value={count} onChange={e => setCount(e.target.value === "" ? 0 : Number(e.target.value))} style={fi} />
        </div>
        <div>
          <label style={labelStyle}>Recommendation points (auto)</label>
          <div style={{ fontSize: 22, fontWeight: 800, color: points > 0 ? "var(--primary)" : "var(--foreground)" }}>{points > 0 ? `+${points}` : points}</div>
        </div>
      </div>
      <BandScale title="Scale — points awarded" rows={bands.map((b: any) => ({ label: b.label, points: b.points }))} />
      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Comment</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} style={{ ...fi, resize: "vertical" }} />
      </div>
      <SaveRow onSave={() => patchAppraisal({ recCount: count, recComment: comment || null })} />
    </section>
  )
}

function CommentsSection({ appraisal, patchAppraisal }: { appraisal: Appraisal; patchAppraisal: (p: Record<string, unknown>) => Promise<unknown> }) {
  const [comments, setComments] = useState(appraisal.employeeComments ?? "")
  const [improvement, setImprovement] = useState(appraisal.employeeImprovementPlan ?? "")
  const [confirmed, setConfirmed] = useState(!!appraisal.meetingEmployeeConfirmed)
  return (
    <section style={card}>
      <div style={sectionTitle}>Comments &amp; Meeting</div>
      <div style={sectionSub}>Section VII</div>
      <div>
        <label style={labelStyle}>Your comments</label>
        <textarea value={comments} onChange={e => setComments(e.target.value)} rows={4} style={{ ...fi, resize: "vertical" }} />
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={labelStyle}>Your improvement plan</label>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>{SMART_GUIDANCE.developmentPlan}</div>
        <textarea value={improvement} onChange={e => setImprovement(e.target.value)} rows={4} style={{ ...fi, resize: "vertical" }} placeholder="What you'll focus on improving next period (SMART)" />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, cursor: "pointer" }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        I confirm a one-on-one review meeting was/will be held
      </label>
      <SaveRow onSave={() => patchAppraisal({ employeeComments: comments || null, employeeImprovementPlan: improvement || null, meetingEmployeeConfirmed: confirmed })} />
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

      {/* Your scores (employee side) — visible as soon as submitted */}
      <ScoreSummary a={appraisal} cycle={cycle} />

      {/* Your team's upward feedback (leads only) — anonymous synthesis, raw reviews sealed */}
      <TeamLeadFeedback a={appraisal} />

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
          {(appraisal.managementComment || appraisal.reviewerComments || appraisal.areasForImprovement || appraisal.developmentPlan) && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {appraisal.managementComment && <RoText label="Management comment" value={appraisal.managementComment} />}
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
                <th style={th}>Evidence</th>
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
                  <td style={td}>{k.evidenceUrl ? <a href={k.evidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "underline" }}>Open link</a> : <RoCell value={null} />}</td>
                </tr>
              ))}
              {appraisal.kpis.length === 0 && (
                <tr><td style={{ ...td, color: "var(--muted-foreground)", fontSize: 13 }} colSpan={8}>No KPI rows.</td></tr>
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
        <RoText label="Your improvement plan" value={appraisal.employeeImprovementPlan} />
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
