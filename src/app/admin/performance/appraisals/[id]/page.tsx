"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import {
  ArrowLeft, Loader2, BarChart3, Target, Users, ShieldCheck,
  MessageSquare, CheckCircle2, RotateCcw, Pencil,
} from "lucide-react"
import { DEFAULT_QUERY_BANDS, DEFAULT_RECOMMENDATION_BANDS } from "@/lib/appraisal-defaults"
import type { QueryBand, RecommendationBand } from "@/lib/appraisal-defaults"
import { queryPoints, recommendationPoints } from "@/lib/appraisal-scoring"
import { StackedRatings, type RaterRow } from "@/components/performance/StackedRatings"

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
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, color: "var(--foreground)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }

type Person = { firstName: string; lastName: string; jobTitle?: string | null }
type Rating = { raterType: string; section: string; questionId: string | null; score: number | null; comment: string | null; raterId: string | null }
type Kpi = {
  id: string; projectName: string; deliverable: string | null; kpi: string | null; weight: number | null
  employeeScore: number | null; primaryScore: number | null; counterScore: number | null
  reviewerScore: number | null; reviewerComment: string | null; employeeComment: string | null
  primaryComment: string | null; counterComment: string | null; source: string
}
type Appraisal = {
  id: string; stage: string
  employee: Person
  cycle: { id: string; name: string; year: number; half: number; stage: string; weights?: Record<string, number>; queryBands?: QueryBand[] | null; recommendationBands?: RecommendationBand[] | null }
  ratings: Rating[]
  kpis: Kpi[]
  reviewers: { role: string; reviewer: Person }[]
  peers: { id: string; peerId: string; status: string; peer: Person }[]
  keyAchievements: string | null; areasForImprovement: string | null; developmentPlan: string | null
  employeeComments: string | null; reviewerComments: string | null; counterReviewerComments: string | null
  queryWarnings: number | null; queryBadges: number | null; queryEmployeeRating: number | null; queryHrRating: number | null; queryComment: string | null
  queryWarningsHr: number | null; queryBadgesHr: number | null; recCountHr: number | null
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

// ---- Job-Specific KPIs (layered / stacked) ----
function KpisCard({ a, refetch }: { a: Appraisal; refetch: () => Promise<void> }) {
  // Admin may fill the ADMIN-source KPIs (Brand, Learning & Dev) until finalize.
  const editable = a.stage !== "FINALIZED"

  // Local edit map for the editable ADMIN-source KPI rows, keyed by KPI id.
  // The admin score is stored on the KPI's employeeScore/employeeComment.
  const [edits, setEdits] = useState<Record<string, { score: number | null; comment: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const adminKpis = a.kpis.filter(k => k.source === "ADMIN")

  useEffect(() => {
    const m: Record<string, { score: number | null; comment: string }> = {}
    for (const k of adminKpis) m[k.id] = { score: k.employeeScore ?? null, comment: k.employeeComment ?? "" }
    setEdits(m)
  }, [a.kpis])

  function onChange(kpiId: string, patch: { score?: number | null; comment?: string }) {
    setSaved(false)
    setEdits(s => {
      const cur = s[kpiId] ?? { score: null, comment: "" }
      return { ...s, [kpiId]: { score: patch.score !== undefined ? patch.score : cur.score, comment: patch.comment !== undefined ? patch.comment : cur.comment } }
    })
  }

  function rowsFor(k: Kpi): RaterRow[] {
    if (k.source === "ADMIN") {
      const edit = edits[k.id]
      return [{
        raterType: "ADMIN", label: "Admin",
        score: edit ? edit.score : (k.employeeScore ?? null),
        comment: edit ? edit.comment : (k.employeeComment ?? null),
        editable,
      }]
    }
    // STAFF-source: read-only Employee / Team Lead / Reviewer 2.
    return [
      { raterType: "SELF", label: "Employee", score: k.employeeScore ?? null, comment: k.employeeComment ?? null, editable: false },
      { raterType: "PRIMARY_REVIEWER", label: "Team Lead", score: k.primaryScore ?? null, comment: k.primaryComment ?? null, editable: false },
      { raterType: "COUNTER_REVIEWER", label: "Reviewer 2", score: k.counterScore ?? null, comment: k.counterComment ?? null, editable: false },
    ]
  }

  async function saveAdmin() {
    setSaving(true)
    try {
      for (const k of adminKpis) {
        const cur = edits[k.id] ?? { score: null, comment: "" }
        await jpatch(`/api/performance/appraisals/${a.id}/kpis/${k.id}`, { employeeScore: cur.score, employeeComment: cur.comment.trim() })
      }
      await refetch()
      setSaved(true)
    } finally { setSaving(false) }
  }

  return (
    <SectionCard icon={<Target size={17} />} title="Job-Specific KPIs (Section III)"
      subtitle="Each KPI scored out of its weight.">
      {a.kpis.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No KPIs.</p>
      ) : a.kpis.map(k => (
        <StackedRatings
          key={k.id}
          mode="number"
          scaleMax={k.weight ?? 0}
          questionText={`${k.projectName} — ${k.kpi ?? k.deliverable ?? ""} (weight ${k.weight ?? "—"}) · ${k.source}`}
          rows={rowsFor(k)}
          onChange={(_raterType, patch) => onChange(k.id, patch)}
        />
      ))}
      {adminKpis.length > 0 && editable && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
          <button onClick={saveAdmin} disabled={saving} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
            {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />} Save admin KPI scores
          </button>
          {saved && !saving && <span style={{ fontSize: 12, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14} /> Saved</span>}
        </div>
      )}
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

// ---- Reviews (stacked) — Behavioural (II) & Core Values (IV) ----
type Question = { id: string; section: string; text: string; scaleMax: number; order: number; adminScored: boolean }

function StackedReviewsCard({ a, questions, refetch }: {
  a: Appraisal
  questions: Question[]
  refetch: () => Promise<void>
}) {
  // Admin may edit ADMIN-scored rows (e.g. attendance) any time before finalize.
  const adminEditable = a.stage !== "FINALIZED"

  // Local edit map for the editable ADMIN rows, keyed by questionId.
  const [adminEdits, setAdminEdits] = useState<Record<string, { score: number | null; comment: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed the admin edit map from the ADMIN ratings.
  useEffect(() => {
    const m: Record<string, { score: number | null; comment: string }> = {}
    for (const q of questions) {
      if (!q.adminScored) continue
      const r = a.ratings.find(x => x.section === "CORE_VALUE" && x.raterType === "ADMIN" && x.questionId === q.id)
      m[q.id] = { score: r?.score ?? null, comment: r?.comment ?? "" }
    }
    setAdminEdits(m)
  }, [questions, a.ratings])

  const groups: { key: string; title: string; icon: React.ReactNode }[] = [
    { key: "BEHAVIOURAL", title: "Behavioural (Section II)", icon: <Users size={17} /> },
    { key: "CORE_VALUE", title: "Organisation Core Values (Section IV)", icon: <ShieldCheck size={17} /> },
  ]

  function ratingFor(qid: string, raterType: string) {
    return a.ratings.find(r => r.questionId === qid && r.raterType === raterType)
  }

  function rowsFor(q: Question): RaterRow[] {
    // Always show Employee / Team Lead / Reviewer 2 (read-only) so the admin sees who has/hasn't filled.
    const rows: RaterRow[] = [
      { raterType: "SELF", label: "Employee", score: ratingFor(q.id, "SELF")?.score ?? null, comment: ratingFor(q.id, "SELF")?.comment ?? null, editable: false },
      { raterType: "PRIMARY_REVIEWER", label: "Team Lead", score: ratingFor(q.id, "PRIMARY_REVIEWER")?.score ?? null, comment: ratingFor(q.id, "PRIMARY_REVIEWER")?.comment ?? null, editable: false },
      { raterType: "COUNTER_REVIEWER", label: "Reviewer 2", score: ratingFor(q.id, "COUNTER_REVIEWER")?.score ?? null, comment: ratingFor(q.id, "COUNTER_REVIEWER")?.comment ?? null, editable: false },
    ]
    // Behavioural: one read-only row per assigned peer (whether or not they've rated yet).
    if (q.section === "BEHAVIOURAL") {
      a.peers.forEach((p, i) => {
        const r = a.ratings.find(x => x.raterType === "PEER" && x.questionId === q.id && x.raterId === p.peerId)
        rows.push({
          raterType: "PEER" as RaterRow["raterType"],
          label: `Peer Reviewer ${i + 1}`,
          score: r?.score ?? null, comment: r?.comment ?? null, editable: false,
        })
      })
    }
    // Admin row only when the question is admin-scored (e.g. attendance) — editable until finalize.
    if (q.adminScored) {
      const edit = adminEdits[q.id]
      rows.push({
        raterType: "ADMIN", label: "Admin",
        score: edit ? edit.score : (ratingFor(q.id, "ADMIN")?.score ?? null),
        comment: edit ? edit.comment : (ratingFor(q.id, "ADMIN")?.comment ?? null),
        editable: adminEditable,
      })
    }
    return rows
  }

  // LEADERSHIP (upward) rows: one read-only row per distinct team-member rater.
  function memberRowsFor(q: Question): RaterRow[] {
    const members = a.ratings.filter(r => r.raterType === "MEMBER" && r.questionId === q.id)
    const seen: string[] = []
    for (const r of members) {
      const key = r.raterId ?? ""
      if (!seen.includes(key)) seen.push(key)
    }
    return members.map(r => ({
      raterType: "MEMBER" as RaterRow["raterType"],
      label: `Team member ${seen.indexOf(r.raterId ?? "") + 1}`,
      score: r.score ?? null, comment: r.comment ?? null, editable: false,
    }))
  }

  const leadershipQs = questions.filter(q => q.section === "LEADERSHIP").sort((x, y) => x.order - y.order)
  const hasMemberRatings = a.ratings.some(r => r.raterType === "MEMBER")

  function onChange(qid: string, patch: { score?: number | null; comment?: string }) {
    setAdminEdits(s => {
      const cur = s[qid] ?? { score: null, comment: "" }
      return { ...s, [qid]: { score: patch.score !== undefined ? patch.score : cur.score, comment: patch.comment !== undefined ? patch.comment : cur.comment } }
    })
  }

  const adminQuestions = questions.filter(q => q.adminScored)

  async function saveAdmin() {
    setError(null)
    const ratings = adminQuestions.map(q => {
      const cur = adminEdits[q.id] ?? { score: null, comment: "" }
      return { questionId: q.id, score: cur.score, comment: cur.comment.trim() }
    })
    if (ratings.some(r => r.score === null || Number.isNaN(r.score))) {
      setError("Every admin item needs a score.")
      return
    }
    if (ratings.some(r => !r.comment)) {
      setError("Every admin item needs a comment.")
      return
    }
    setSaving(true)
    try {
      const res = await jpost(`/api/performance/appraisals/${a.id}/ratings`, {
        section: "CORE_VALUE", raterType: "ADMIN", ratings,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? "Failed to save admin scores.")
        return
      }
      await refetch()
      setSaved(true)
    } finally { setSaving(false) }
  }

  return (
    <>
      {groups.map(g => {
        const qs = questions.filter(q => q.section === g.key).sort((x, y) => x.order - y.order)
        return (
          <SectionCard key={g.key} icon={g.icon} title={g.title}
            subtitle="Stacked per question — Employee, Team Lead, Reviewer 2 (read-only) and Admin (attendance) layered.">
            {g.key === "BEHAVIOURAL" && a.peers.length === 0 && (
              <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 12 }}>No peer reviewers assigned.</p>
            )}
            {qs.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No questions in this section.</p>
            ) : qs.map(q => (
              <StackedRatings
                key={q.id}
                questionText={q.text}
                scaleMax={q.scaleMax}
                rows={rowsFor(q)}
                onChange={(_raterType, patch) => onChange(q.id, patch)}
              />
            ))}
            {g.key === "CORE_VALUE" && adminQuestions.length > 0 && adminEditable && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                <button onClick={saveAdmin} disabled={saving} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
                  {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />} Save attendance / admin scores
                </button>
                {saved && !saving && <span style={{ fontSize: 12, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14} /> Saved</span>}
                {error && <span style={{ color: "#EF4444", fontSize: 13, fontWeight: 600 }}>{error}</span>}
              </div>
            )}
          </SectionCard>
        )
      })}
      <SectionCard icon={<ShieldCheck size={17} />} title="Team Lead Review (upward)"
        subtitle="Team-member upward reviews of this appraisal's subject (read-only).">
        {leadershipQs.length === 0 || !hasMemberRatings ? (
          <p style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>
            No team-member (upward) reviews — this appraisal&apos;s subject is not a team lead, or none submitted yet.
          </p>
        ) : leadershipQs.map(q => (
          <StackedRatings
            key={q.id}
            questionText={q.text}
            scaleMax={q.scaleMax}
            rows={memberRowsFor(q)}
            onChange={() => {}}
          />
        ))}
      </SectionCard>
    </>
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

function SubHead({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--foreground)", margin: "16px 0 8px", paddingTop: 12, borderTop: "1px solid var(--border)" }}>{children}</h3>
}

function ReadField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>{value === null || value === undefined || value === "" ? "—" : value}</div>
    </div>
  )
}

function ScaleList({ title, bands }: { title: string; bands: { label: string; points: number }[] }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--muted-foreground)" }}>
        {bands.map((b, i) => (
          <li key={i}>{b.label}: {b.points > 0 ? `+${b.points}` : b.points}</li>
        ))}
      </ul>
    </div>
  )
}

function CommentsCard({ a, refetch }: { a: Appraisal; refetch: () => Promise<void> }) {
  const canEdit = a.cycle.stage === "COMPILING"
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [qWarn, setQWarn] = useState("")
  const [qBadge, setQBadge] = useState("")
  const [rCount, setRCount] = useState("")

  const qBands = a.cycle.queryBands && a.cycle.queryBands.length ? a.cycle.queryBands : DEFAULT_QUERY_BANDS
  const rBands = a.cycle.recommendationBands && a.cycle.recommendationBands.length ? a.cycle.recommendationBands : DEFAULT_RECOMMENDATION_BANDS

  function start() {
    const f: Record<string, string> = {}
    for (const { key } of COMPILE_TEXT_FIELDS) f[key as string] = (a[key] as string | null) ?? ""
    setForm(f)
    setQWarn(a.queryWarningsHr === null || a.queryWarningsHr === undefined ? "" : String(a.queryWarningsHr))
    setQBadge(a.queryBadgesHr === null || a.queryBadgesHr === undefined ? "" : String(a.queryBadgesHr))
    setRCount(a.recCountHr === null || a.recCountHr === undefined ? "" : String(a.recCountHr))
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { ...form }
      payload.queryWarningsHr = Number(qWarn || 0)
      payload.queryBadgesHr = Number(qBadge || 0)
      payload.recCountHr = Number(rCount || 0)
      await jpatch(`/api/performance/appraisals/${a.id}`, payload)
      await refetch()
      setEditing(false)
    } finally { setSaving(false) }
  }

  const yesNo = (v: boolean | null) => (v === null || v === undefined ? "—" : v ? "Yes" : "No")
  const ta: React.CSSProperties = { ...fi, minHeight: 72, resize: "vertical" }

  return (
    <SectionCard icon={<MessageSquare size={17} />} title="Query, Recommendation & Improvement (Sections V–VII)">
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {COMPILE_TEXT_FIELDS.map(({ key, label }) => (
            <div key={key as string} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>{label}</label>
              <textarea style={ta} value={form[key as string] ?? ""} onChange={e => setForm({ ...form, [key as string]: e.target.value })} />
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Query (HR) — Section V</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>How many warnings? (HR)</label>
                <input type="number" min={0} style={fi} value={qWarn} onChange={e => setQWarn(e.target.value)} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>How many official query badges? (HR)</label>
                <input type="number" min={0} style={fi} value={qBadge} onChange={e => setQBadge(e.target.value)} />
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              Query points (auto): {queryPoints(qBands, Number(qWarn || 0), Number(qBadge || 0))}
            </div>
            <ScaleList title="Scale — points deducted" bands={qBands} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Recommendations (HR) — Section VI</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxWidth: 280 }}>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>How many recommendations? (HR)</label>
              <input type="number" min={0} style={fi} value={rCount} onChange={e => setRCount(e.target.value)} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              Recommendation points (auto): {recommendationPoints(rBands, Number(rCount || 0))}
            </div>
            <ScaleList title="Scale — points awarded" bands={rBands} />
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
          <SubHead>Section V — Query</SubHead>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
            <ReadField label="Warnings / Badges (staff)" value={`${n(a.queryWarnings)} / ${n(a.queryBadges)}`} />
            <ReadField label="Warnings / Badges (HR)" value={`${n(a.queryWarningsHr)} / ${n(a.queryBadgesHr)}`} />
            <ReadField label="Query points — Employee / HR" value={`${n(a.queryEmployeeRating)} / ${n(a.queryHrRating)}`} />
          </div>
          <ReadField label="Query comment" value={a.queryComment} />

          <SubHead>Section VI — Recommendation</SubHead>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
            <ReadField label="Recommendations (staff / HR)" value={`${n(a.recCount)} / ${n(a.recCountHr)}`} />
            <ReadField label="Recommendation points — Employee / HR" value={`${n(a.recEmployeeRating)} / ${n(a.recHrRating)}`} />
          </div>
          <ReadField label="Recommendation comment" value={a.recComment} />

          <SubHead>Section VII — Improvement &amp; Comments</SubHead>
          <ReadField label="Key achievements" value={a.keyAchievements} />
          <ReadField label="Areas for improvement" value={a.areasForImprovement} />
          <ReadField label="Development plan" value={a.developmentPlan} />
          <ReadField label="Employee comments" value={a.employeeComments} />
          <ReadField label="Employee improvement plan" value={(a as { employeeImprovementPlan?: string | null }).employeeImprovementPlan} />
          <ReadField label="Reviewer comments" value={a.reviewerComments} />
          <ReadField label="Counter reviewer comments" value={a.counterReviewerComments} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginTop: 4 }}>
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
  // Finalizable once the employee has submitted (reviews may or may not be complete).
  const canFinalize = ["SUBMITTED", "LEAD_REVIEWING", "LEAD_DONE"].includes(a.stage)
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
  const [questions, setQuestions] = useState<Question[]>([])

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/performance/appraisals/${id}`)
    if (!res.ok) { setNotFound(true); return }
    const data = await res.json()
    const appraisal: Appraisal | null = data.appraisal ?? null
    setA(appraisal)
    if (appraisal?.cycle?.id) {
      const qRes = await fetch(`/api/performance/questions?cycleId=${appraisal.cycle.id}`)
      if (qRes.ok) {
        const qData = await qRes.json()
        setQuestions(qData.questions ?? [])
      } else {
        setQuestions([])
      }
    }
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
      <StackedReviewsCard a={a} questions={questions} refetch={refetch} />
      <KpisCard a={a} refetch={refetch} />
      <CommentsCard a={a} refetch={refetch} />
      <ActionBar a={a} refetch={refetch} />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
