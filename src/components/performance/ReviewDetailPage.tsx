"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Star, ArrowLeft, CheckCircle2 } from "lucide-react"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { ScaleLegend } from "@/components/performance/scale"
import { StackedRatings, type RaterRow } from "@/components/performance/StackedRatings"
import { SMART_GUIDANCE, DEFAULT_QUERY_BANDS, DEFAULT_RECOMMENDATION_BANDS } from "@/lib/appraisal-defaults"
import type { QueryBand, RecommendationBand } from "@/lib/appraisal-defaults"
import { queryPoints, recommendationPoints } from "@/lib/appraisal-scoring"

interface Kpi {
  id: string
  projectName?: string | null
  deliverable?: string | null
  kpi?: string | null
  weight?: number | null
  employeeScore?: number | null
  employeeComment?: string | null
  evidenceUrl?: string | null
  primaryScore?: number | null
  counterScore?: number | null
  primaryComment?: string | null
  counterComment?: string | null
  reviewerScore?: number | null
  reviewerComment?: string | null
  source?: string | null
}

interface Rating {
  raterType: string
  section: string
  questionId: string
  score?: number | null
  comment?: string | null
}

interface Appraisal {
  id: string
  stage: string
  employee: { firstName: string; lastName: string; jobTitle?: string | null }
  cycle: { id: string; name: string; year?: number; half?: string; stage: string; queryBands?: QueryBand[] | null; recommendationBands?: RecommendationBand[] | null }
  kpis: Kpi[]
  ratings: Rating[]
  reviewers: { role: string; reviewer: { firstName: string; lastName: string } }[]
  keyAchievements?: string | null
  areasForImprovement?: string | null
  developmentPlan?: string | null
  employeeComments?: string | null
  reviewerComments?: string | null
  counterReviewerComments?: string | null
  queryEmployeeRating?: number | null
  queryHrRating?: number | null
  recEmployeeRating?: number | null
  recHrRating?: number | null
  queryWarningsHr?: number | null
  queryBadgesHr?: number | null
  recCountHr?: number | null
  meetingEmployeeConfirmed?: boolean | null
  meetingReviewerConfirmed?: boolean | null
  behavioural360Emp?: number | null
  behavioural360Rev?: number | null
  jobScoreEmp?: number | null
  jobScoreRev?: number | null
  coreScoreEmp?: number | null
  coreScoreRev?: number | null
  finalEmployeePercent?: number | null
  finalReviewerPercent?: number | null
  finalPercent?: number | null
  teamLeadPercent?: number | null
}

interface Relationship {
  isPrimary: boolean
  isCounter: boolean
  isReviewer: boolean
  isSubject: boolean
  isAdmin: boolean
  canSeeFull: boolean
}

interface Question { id: string; section: string; text: string; scaleMax: number; order: number; adminScored: boolean }

const fi: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
  background: "var(--background)",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
}

const primaryBtn: React.CSSProperties = {
  padding: "9px 18px",
  background: "var(--primary)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  color: "white",
}

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "var(--foreground)",
  margin: "0 0 14px 0",
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted-foreground)",
  display: "block",
  marginBottom: 6,
}

const fieldRow: React.CSSProperties = { marginBottom: 14 }

function SavedTick({ show }: { show: boolean }) {
  if (!show) return null
  return <span style={{ fontSize: 12, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14} /> Saved</span>
}

function ScaleList({ title, bands }: { title: string; bands: { label: string; points: number }[] }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--muted-foreground)" }}>
        {bands.map((b, i) => (
          <li key={i}>
            {b.label}: {b.points > 0 ? `+${b.points}` : b.points}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [appraisal, setAppraisal] = useState<Appraisal | null>(null)
  const [relationship, setRelationship] = useState<Relationship | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [base, setBase] = useState("")

  // editable local state
  // The reviewer's OWN editable KPI rows, keyed by kpiId.
  const [kpiEdits, setKpiEdits] = useState<Record<string, { score: number | null; comment: string }>>({})
  // The reviewer's OWN editable rows, keyed by questionId, per section.
  const [cvEdits, setCvEdits] = useState<Record<string, { score: number | null; comment: string }>>({})
  const [behEdits, setBehEdits] = useState<Record<string, { score: number | null; comment: string }>>({})
  const [feedback, setFeedback] = useState({
    keyAchievements: "",
    areasForImprovement: "",
    developmentPlan: "",
    reviewerComments: "",
    counterReviewerComments: "",
    meetingReviewerConfirmed: false,
  })

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cvSaving, setCvSaving] = useState(false)
  const [cvErr, setCvErr] = useState<string | null>(null)
  const [behSaving, setBehSaving] = useState(false)
  const [behErr, setBehErr] = useState<string | null>(null)
  const [kpiSaving, setKpiSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null) // which section just saved

  const behQuestions = questions.filter(q => q.section === "BEHAVIOURAL").sort((a, b) => a.order - b.order)
  const cvQuestions = questions.filter(q => q.section === "CORE_VALUE").sort((a, b) => a.order - b.order)
  const [fbSaving, setFbSaving] = useState(false)

  const raterType = relationship?.isPrimary ? "PRIMARY_REVIEWER" : "COUNTER_REVIEWER"
  // Reviewer can fill once the employee has submitted, until finalized — not tied to a global REVIEW stage.
  const reviewable = ["SUBMITTED", "LEAD_REVIEWING", "LEAD_DONE"].includes(appraisal?.stage ?? "")
  const editable = reviewable && !!relationship?.isReviewer

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBase(window.location.pathname.split("/performance")[0])
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let rel: Relationship | null = null
    fetch(`/api/performance/appraisals/${id}`)
      .then(r => r.json())
      .then((d: { appraisal: Appraisal; relationship: Relationship }) => {
        const ap = d.appraisal
        rel = d.relationship
        setAppraisal(ap)
        setRelationship(d.relationship)

        // Seed the reviewer's OWN editable KPI rows from their own score/comment.
        const ke: Record<string, { score: number | null; comment: string }> = {}
        ap.kpis.forEach(k => {
          const score = d.relationship.isPrimary ? k.primaryScore : k.counterScore
          const comment = d.relationship.isPrimary ? k.primaryComment : k.counterComment
          ke[k.id] = { score: score ?? null, comment: comment ?? "" }
        })
        setKpiEdits(ke)

        setFeedback({
          keyAchievements: ap.keyAchievements ?? "",
          areasForImprovement: ap.areasForImprovement ?? "",
          developmentPlan: ap.developmentPlan ?? "",
          reviewerComments: ap.reviewerComments ?? "",
          counterReviewerComments: ap.counterReviewerComments ?? "",
          meetingReviewerConfirmed: !!ap.meetingReviewerConfirmed,
        })

        return fetch(`/api/performance/questions?cycleId=${ap.cycle.id}`)
          .then(r => r.json())
          .then((q: { questions: Question[] }) => ({ ap, q }))
      })
      .then((res: { ap: Appraisal; q: { questions: Question[] } } | void) => {
        if (!res) return
        const { ap, q } = res
        const qs = q.questions ?? []
        setQuestions(qs)

        // Seed the reviewer's own editable rows from the appraisal's ratings.
        const own = rel?.isPrimary ? "PRIMARY_REVIEWER" : "COUNTER_REVIEWER"
        const seedFor = (section: string) => {
          const map: Record<string, { score: number | null; comment: string }> = {}
          qs.filter(x => x.section === section).forEach(x => {
            const r = ap.ratings.find(rr => rr.raterType === own && rr.questionId === x.id)
            map[x.id] = { score: r?.score ?? null, comment: r?.comment ?? "" }
          })
          return map
        }
        setBehEdits(seedFor("BEHAVIOURAL"))
        setCvEdits(seedFor("CORE_VALUE"))
      })
      .finally(() => setLoading(false))
  }, [id])

  // Re-fetch the appraisal so the Scores summary reflects the latest
  // server-computed values. Only updates the `appraisal` object; in-progress
  // editable inputs are left untouched.
  function refreshScores() {
    fetch(`/api/performance/appraisals/${id}`)
      .then(r => r.json())
      .then((d: { appraisal: Appraisal }) => {
        if (d?.appraisal) setAppraisal(d.appraisal)
      })
      .catch(() => {})
  }

  async function saveKpis() {
    if (!editable || !relationship || !appraisal) return
    setKpiSaving(true)
    // Only STAFF-sourced KPIs are scored by the reviewer; admin KPIs are skipped.
    const staffKpis = appraisal.kpis.filter(k => k.source !== "ADMIN")
    try {
      await Promise.all(
        staffKpis.map(k => {
          const edit = kpiEdits[k.id] ?? { score: null, comment: "" }
          const body: Record<string, unknown> = relationship.isPrimary
            ? { primaryScore: edit.score, primaryComment: edit.comment }
            : { counterScore: edit.score, counterComment: edit.comment }
          return fetch(`/api/performance/appraisals/${id}/kpis/${k.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        })
      )
    } finally {
      setKpiSaving(false)
      refreshScores()
      setSavedKey("kpi")
    }
  }

  // Build the stacked rows for one KPI: Employee (read-only) → reviewer's own
  // editable row. Admin-sourced KPIs (Brand, L&D) get only the read-only Employee row.
  function rowsForKpi(k: Kpi): RaterRow[] {
    const rows: RaterRow[] = [
      { raterType: "SELF", label: "Employee", score: k.employeeScore ?? null, comment: k.employeeComment ?? null, editable: false },
    ]
    if (k.source !== "ADMIN") {
      const edit = kpiEdits[k.id] ?? { score: null, comment: "" }
      rows.push({
        raterType,
        label: relationship?.isPrimary ? "Team Lead" : "Reviewer 2",
        score: edit.score,
        comment: edit.comment,
        editable,
      })
    }
    return rows
  }

  function saveCoreValues() {
    if (!editable || !relationship) return
    const ratings = cvQuestions.map(q => ({
      questionId: q.id,
      score: cvEdits[q.id]?.score ?? null,
      comment: (cvEdits[q.id]?.comment ?? "").trim(),
    }))
    if (ratings.some(r => r.score == null || !r.comment)) {
      setCvErr("Give every item a score and a comment."); return
    }
    setCvErr(null); setCvSaving(true)
    fetch(`/api/performance/appraisals/${id}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "CORE_VALUE",
        raterType,
        ratings,
      }),
    }).finally(() => { setCvSaving(false); refreshScores(); setSavedKey("cv") })
  }

  function saveBehavioural() {
    if (!editable || !relationship) return
    const ratings = behQuestions.map(q => ({
      questionId: q.id,
      score: behEdits[q.id]?.score ?? null,
      comment: (behEdits[q.id]?.comment ?? "").trim(),
    }))
    if (ratings.some(r => r.score == null || !r.comment)) {
      setBehErr("Give every item a score and a comment."); return
    }
    setBehErr(null); setBehSaving(true)
    fetch(`/api/performance/appraisals/${id}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "BEHAVIOURAL",
        raterType,
        ratings,
      }),
    }).finally(() => { setBehSaving(false); refreshScores(); setSavedKey("beh") })
  }

  // Build the stacked rows for one question: Employee (read-only) → reviewer's own
  // editable row → Admin (read-only, only for adminScored questions).
  function rowsForQuestion(q: Question, edits: Record<string, { score: number | null; comment: string }>): RaterRow[] {
    if (!appraisal || !relationship) return []
    const self = appraisal.ratings.find(r => r.raterType === "SELF" && r.questionId === q.id)
    const own = edits[q.id] ?? { score: null, comment: "" }
    const rows: RaterRow[] = [
      { raterType: "SELF", label: "Employee", score: self?.score ?? null, comment: self?.comment ?? null, editable: false },
      {
        raterType,
        label: relationship.isPrimary ? "Team Lead" : "Reviewer 2",
        score: own.score,
        comment: own.comment,
        editable,
      },
    ]
    if (q.adminScored) {
      const admin = appraisal.ratings.find(r => r.raterType === "ADMIN" && r.questionId === q.id)
      rows.push({ raterType: "ADMIN", label: "Admin", score: admin?.score ?? null, comment: admin?.comment ?? null, editable: false })
    }
    return rows
  }

  function saveFeedback() {
    if (!editable || !relationship) return
    setFbSaving(true)
    const body: Record<string, unknown> = {
      keyAchievements: feedback.keyAchievements,
      areasForImprovement: feedback.areasForImprovement,
      developmentPlan: feedback.developmentPlan,
      reviewerComments: feedback.reviewerComments,
      meetingReviewerConfirmed: feedback.meetingReviewerConfirmed,
    }
    if (relationship.isCounter) body.counterReviewerComments = feedback.counterReviewerComments
    fetch(`/api/performance/appraisals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).finally(() => { setFbSaving(false); refreshScores(); setSavedKey("fb") })
  }

  function submitReview() {
    setSubmitting(true)
    fetch(`/api/performance/appraisals/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reviewerSubmit" }),
    })
      .then(() => {
        setConfirmOpen(false)
        router.push(`${base}/performance/to-review`)
      })
      .finally(() => setSubmitting(false))
  }

  if (loading) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto", color: "var(--muted-foreground)", fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (!appraisal || !relationship) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto", color: "var(--muted-foreground)", fontSize: 13 }}>
        Appraisal not found.
      </div>
    )
  }

  const roleName = relationship.isPrimary ? "Primary" : relationship.isCounter ? "Counter" : "—"

  const qBands = appraisal.cycle.queryBands && appraisal.cycle.queryBands.length ? appraisal.cycle.queryBands : DEFAULT_QUERY_BANDS
  const rBands = appraisal.cycle.recommendationBands && appraisal.cycle.recommendationBands.length ? appraisal.cycle.recommendationBands : DEFAULT_RECOMMENDATION_BANDS

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <button
        onClick={() => router.push(`${base}/performance/to-review`)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          color: "var(--muted-foreground)",
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={15} /> Back to To Review
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Star size={22} color="var(--primary)" />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0, lineHeight: 1.2 }}>
          {appraisal.employee.firstName} {appraisal.employee.lastName}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 4px 0" }}>
        {appraisal.employee.jobTitle ?? "—"} · {appraisal.cycle.name}
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 24px 0" }}>
        Your role: {roleName} reviewer{!editable && " · Read-only"}
      </p>

      {/* SECTION — Score the KPIs (stacked: Employee read-only on top, your row below) */}
      <div style={card}>
        <h2 style={sectionTitle}>Score the KPIs</h2>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: -8, marginBottom: 14 }}>Each KPI is scored out of its assigned weight.</p>
        {appraisal.kpis.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No KPIs to score.</div>
        ) : (
          appraisal.kpis.map(k => (
            <div key={k.id}>
              <StackedRatings
                questionText={`${k.projectName ?? "—"} — ${k.kpi ?? k.deliverable ?? ""} (weight ${k.weight ?? 0})`}
                scaleMax={k.weight ?? 0}
                mode="number"
                rows={rowsForKpi(k)}
                onChange={(rt, patch) => {
                  if (rt !== raterType || k.source === "ADMIN") return
                  setKpiEdits(s => ({ ...s, [k.id]: { score: s[k.id]?.score ?? null, comment: s[k.id]?.comment ?? "", ...patch } }))
                }}
              />
              {k.evidenceUrl && (
                <div style={{ fontSize: 12, margin: "-6px 0 12px 2px" }}>
                  Evidence: <a href={k.evidenceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Open link</a>
                </div>
              )}
              {k.source === "ADMIN" && (
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "-6px 0 12px 2px" }}>
                  Admin-scored — reviewers cannot rate this item.
                </div>
              )}
            </div>
          ))
        )}
        {editable && appraisal.kpis.some(k => k.source !== "ADMIN") && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ ...primaryBtn, opacity: kpiSaving ? 0.6 : 1 }} disabled={kpiSaving} onClick={saveKpis}>
            {kpiSaving ? "Saving…" : "Save KPI scores"}
          </button>
          <SavedTick show={savedKey === "kpi" && !kpiSaving} />
          </div>
        )}
      </div>

      {/* SECTION 3 — Behavioural (Section II) — stacked per question */}
      <div style={card}>
        <h2 style={sectionTitle}>Behavioural (Section II)</h2>
        {editable && behQuestions.length > 0 && <ScaleLegend scaleMax={behQuestions[0]?.scaleMax ?? 5} />}
        {behQuestions.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No behavioural questions.</div>
        ) : (
          behQuestions.map(q => (
            <StackedRatings
              key={q.id}
              questionText={q.text}
              scaleMax={q.scaleMax}
              rows={rowsForQuestion(q, behEdits)}
              onChange={(rt, patch) => {
                if (rt !== raterType) return
                setBehEdits(s => ({ ...s, [q.id]: { score: s[q.id]?.score ?? null, comment: s[q.id]?.comment ?? "", ...patch } }))
              }}
            />
          ))
        )}
        {behErr && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{behErr}</div>}
        {editable && behQuestions.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ ...primaryBtn, opacity: behSaving ? 0.6 : 1 }} disabled={behSaving} onClick={saveBehavioural}>
            {behSaving ? "Saving…" : "Save"}
          </button>
          <SavedTick show={savedKey === "beh" && !behSaving} />
          </div>
        )}
      </div>

      {/* SECTION 4 — Organisation Core Values (Section IV) — stacked per question */}
      <div style={card}>
        <h2 style={sectionTitle}>Organisation Core Values (Section IV)</h2>
        {editable && cvQuestions.length > 0 && <ScaleLegend scaleMax={cvQuestions[0]?.scaleMax ?? 3} />}
        {cvQuestions.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No core-value questions.</div>
        ) : (
          cvQuestions.map(q => (
            <StackedRatings
              key={q.id}
              questionText={q.text}
              scaleMax={q.scaleMax}
              rows={rowsForQuestion(q, cvEdits)}
              onChange={(rt, patch) => {
                if (rt !== raterType) return
                setCvEdits(s => ({ ...s, [q.id]: { score: s[q.id]?.score ?? null, comment: s[q.id]?.comment ?? "", ...patch } }))
              }}
            />
          ))
        )}
        {cvErr && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{cvErr}</div>}
        {editable && cvQuestions.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ ...primaryBtn, opacity: cvSaving ? 0.6 : 1 }} disabled={cvSaving} onClick={saveCoreValues}>
            {cvSaving ? "Saving…" : "Save"}
          </button>
          <SavedTick show={savedKey === "cv" && !cvSaving} />
          </div>
        )}
      </div>

      {/* SECTION 5 — Reviewer feedback */}
      <div style={card}>
        <h2 style={sectionTitle}>Reviewer Feedback (Section VII)</h2>

        <div style={fieldRow}>
          <span style={labelStyle}>Key Achievements</span>
          {editable ? (
            <textarea
              style={{ ...fi, minHeight: 70, resize: "vertical" }}
              value={feedback.keyAchievements}
              onChange={e => setFeedback(f => ({ ...f, keyAchievements: e.target.value }))}
            />
          ) : (
            <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
              {appraisal.keyAchievements || "—"}
            </div>
          )}
        </div>

        <div style={fieldRow}>
          <span style={labelStyle}>Areas for Improvement</span>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", marginBottom: 6 }}>
            {SMART_GUIDANCE.areasForImprovement}
          </div>
          {editable ? (
            <textarea
              style={{ ...fi, minHeight: 70, resize: "vertical" }}
              value={feedback.areasForImprovement}
              onChange={e => setFeedback(f => ({ ...f, areasForImprovement: e.target.value }))}
            />
          ) : (
            <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
              {appraisal.areasForImprovement || "—"}
            </div>
          )}
        </div>

        <div style={fieldRow}>
          <span style={labelStyle}>Development Plan for Next Period</span>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", marginBottom: 6 }}>
            {SMART_GUIDANCE.developmentPlan}
          </div>
          {editable ? (
            <textarea
              style={{ ...fi, minHeight: 70, resize: "vertical" }}
              value={feedback.developmentPlan}
              onChange={e => setFeedback(f => ({ ...f, developmentPlan: e.target.value }))}
            />
          ) : (
            <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
              {appraisal.developmentPlan || "—"}
            </div>
          )}
        </div>

        <div style={fieldRow}>
          <span style={labelStyle}>Reviewer Comments</span>
          {editable ? (
            <textarea
              style={{ ...fi, minHeight: 70, resize: "vertical" }}
              value={feedback.reviewerComments}
              onChange={e => setFeedback(f => ({ ...f, reviewerComments: e.target.value }))}
            />
          ) : (
            <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
              {appraisal.reviewerComments || "—"}
            </div>
          )}
        </div>

        {relationship.isCounter && (
          <div style={fieldRow}>
            <span style={labelStyle}>Counter Reviewer Comments</span>
            {editable ? (
              <textarea
                style={{ ...fi, minHeight: 70, resize: "vertical" }}
                value={feedback.counterReviewerComments}
                onChange={e => setFeedback(f => ({ ...f, counterReviewerComments: e.target.value }))}
              />
            ) : (
              <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
                {appraisal.counterReviewerComments || "—"}
              </div>
            )}
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--foreground)",
            margin: "14px 0",
            cursor: editable ? "pointer" : "default",
          }}
        >
          <input
            type="checkbox"
            disabled={!editable}
            checked={feedback.meetingReviewerConfirmed}
            onChange={e => setFeedback(f => ({ ...f, meetingReviewerConfirmed: e.target.checked }))}
          />
          Meeting confirmed (reviewer)
        </label>

        {editable && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ ...primaryBtn, opacity: fbSaving ? 0.6 : 1 }} disabled={fbSaving} onClick={saveFeedback}>
            {fbSaving ? "Saving…" : "Save feedback"}
          </button>
          <SavedTick show={savedKey === "fb" && !fbSaving} />
          </div>
        )}
      </div>

      {/* SCORES — live summary */}
      <div style={card}>
        <h2 style={sectionTitle}>Scores</h2>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
          Updates each time you save.
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Section</th>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Employee (self)</th>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "360 Behavioural", emp: appraisal.behavioural360Emp != null ? `${appraisal.behavioural360Emp} / 5` : "—", rev: appraisal.behavioural360Rev != null ? `${appraisal.behavioural360Rev} / 5` : "—" },
              { label: "Job-Specific", emp: appraisal.jobScoreEmp != null ? `${appraisal.jobScoreEmp} / 100` : "—", rev: appraisal.jobScoreRev != null ? `${appraisal.jobScoreRev} / 100` : "—" },
              { label: "Core Values", emp: appraisal.coreScoreEmp ?? "—", rev: appraisal.coreScoreRev ?? "—" },
              { label: "Query points", emp: appraisal.queryEmployeeRating ?? "—", rev: appraisal.queryHrRating ?? "—" },
              { label: "Recommendation points", emp: appraisal.recEmployeeRating ?? "—", rev: appraisal.recHrRating ?? "—" },
            ].map(row => (
              <tr key={row.label}>
                <td style={{ padding: "6px 8px", color: "var(--foreground)", borderBottom: "1px solid var(--border)" }}>{row.label}</td>
                <td style={{ padding: "6px 8px", color: "var(--foreground)", borderBottom: "1px solid var(--border)" }}>{row.emp}</td>
                <td style={{ padding: "6px 8px", color: "var(--foreground)", borderBottom: "1px solid var(--border)" }}>{row.rev}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16, fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>
          Reviewer overall score: {appraisal.finalReviewerPercent ?? "—"}%
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted-foreground)" }}>
          Employee self score: {appraisal.finalEmployeePercent ?? "—"}%
        </div>
        {appraisal.teamLeadPercent != null && (
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted-foreground)" }}>
            Team Lead Score: {appraisal.teamLeadPercent}%
          </div>
        )}
      </div>

      {/* SECTION 5 — Submit */}
      {editable && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button style={primaryBtn} onClick={() => setConfirmOpen(true)}>
            Submit review
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitReview}
        loading={submitting}
        title="Submit review"
        confirmText="Submit"
        body={
          <>
            Submit your review for {appraisal.employee.firstName} {appraisal.employee.lastName}? Make sure your KPI
            scores, core-value ratings, and feedback are saved.
          </>
        }
      />
    </div>
  )
}
