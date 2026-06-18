"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Star, ArrowLeft } from "lucide-react"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { ScaleLegend, validateRatings } from "@/components/performance/scale"

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
  cycle: { id: string; name: string; year?: number; half?: string; stage: string }
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
  meetingEmployeeConfirmed?: boolean | null
  meetingReviewerConfirmed?: boolean | null
}

interface Relationship {
  isPrimary: boolean
  isCounter: boolean
  isReviewer: boolean
  isSubject: boolean
  isAdmin: boolean
  canSeeFull: boolean
}

interface CvQuestion { id: string; text: string; scaleMax: number }

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={fieldRow}>
      <span style={labelStyle}>{label}</span>
      <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>{value ?? "—"}</div>
    </div>
  )
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [appraisal, setAppraisal] = useState<Appraisal | null>(null)
  const [relationship, setRelationship] = useState<Relationship | null>(null)
  const [cvQuestions, setCvQuestions] = useState<CvQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [base, setBase] = useState("")

  // editable local state
  const [kpiScores, setKpiScores] = useState<Record<string, string>>({})
  const [reviewerComment, setReviewerComment] = useState("")
  const [cvScores, setCvScores] = useState<Record<string, { score: string; comment: string }>>({})
  const [feedback, setFeedback] = useState({
    keyAchievements: "",
    areasForImprovement: "",
    developmentPlan: "",
    reviewerComments: "",
    counterReviewerComments: "",
    queryHrRating: "",
    recHrRating: "",
    meetingReviewerConfirmed: false,
  })

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cvSaving, setCvSaving] = useState(false)
  const [cvErr, setCvErr] = useState<string | null>(null)
  const [fbSaving, setFbSaving] = useState(false)

  const raterType = relationship?.isPrimary ? "PRIMARY_REVIEWER" : "COUNTER_REVIEWER"
  const editable = appraisal?.cycle.stage === "REVIEW" && !!relationship?.isReviewer

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

        const ks: Record<string, string> = {}
        ap.kpis.forEach(k => {
          const v = d.relationship.isPrimary ? k.primaryScore : k.counterScore
          ks[k.id] = v == null ? "" : String(v)
        })
        setKpiScores(ks)
        // shared reviewerComment — seed from first kpi that has one
        const seed = ap.kpis.find(k => k.reviewerComment)?.reviewerComment ?? ""
        setReviewerComment(seed)

        setFeedback({
          keyAchievements: ap.keyAchievements ?? "",
          areasForImprovement: ap.areasForImprovement ?? "",
          developmentPlan: ap.developmentPlan ?? "",
          reviewerComments: ap.reviewerComments ?? "",
          counterReviewerComments: ap.counterReviewerComments ?? "",
          queryHrRating: ap.queryHrRating == null ? "" : String(ap.queryHrRating),
          recHrRating: ap.recHrRating == null ? "" : String(ap.recHrRating),
          meetingReviewerConfirmed: !!ap.meetingReviewerConfirmed,
        })

        const rt = d.relationship.isPrimary ? "PRIMARY_REVIEWER" : "COUNTER_REVIEWER"
        return fetch(`/api/performance/appraisals/${id}/rate?raterType=${rt}`).then(r => r.json())
      })
      .then((cv: { questions: CvQuestion[]; myRatings: { questionId: string; score?: number | null; comment?: string | null }[] }) => {
        if (!cv) return
        setCvQuestions(cv.questions ?? [])
        const cs: Record<string, { score: string; comment: string }> = {}
        ;(cv.questions ?? []).forEach(q => {
          const mr = (cv.myRatings ?? []).find(m => m.questionId === q.id)
          cs[q.id] = { score: mr?.score == null ? "" : String(mr.score), comment: mr?.comment ?? "" }
        })
        setCvScores(cs)
      })
      .finally(() => setLoading(false))
  }, [id])

  function saveKpi(kpiId: string) {
    if (!editable || !relationship) return
    const raw = kpiScores[kpiId]
    const value = raw === "" ? null : Number(raw)
    const body: Record<string, unknown> = { reviewerComment }
    if (relationship.isPrimary) body.primaryScore = value
    else body.counterScore = value
    fetch(`/api/performance/appraisals/${id}/kpis/${kpiId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  function saveCoreValues() {
    if (!editable || !relationship) return
    const ratings = cvQuestions.map(q => ({
      questionId: q.id,
      score: cvScores[q.id]?.score === "" || cvScores[q.id]?.score == null ? null : Number(cvScores[q.id]?.score),
      comment: (cvScores[q.id]?.comment ?? "").trim(),
    }))
    const v = validateRatings(ratings)
    if (v) { setCvErr(v); return }
    setCvErr(null); setCvSaving(true)
    fetch(`/api/performance/appraisals/${id}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "CORE_VALUE",
        raterType,
        ratings,
      }),
    }).finally(() => setCvSaving(false))
  }

  function saveFeedback() {
    if (!editable || !relationship) return
    setFbSaving(true)
    const body: Record<string, unknown> = {
      keyAchievements: feedback.keyAchievements,
      areasForImprovement: feedback.areasForImprovement,
      developmentPlan: feedback.developmentPlan,
      reviewerComments: feedback.reviewerComments,
      queryHrRating: feedback.queryHrRating === "" ? null : Number(feedback.queryHrRating),
      recHrRating: feedback.recHrRating === "" ? null : Number(feedback.recHrRating),
      meetingReviewerConfirmed: feedback.meetingReviewerConfirmed,
    }
    if (relationship.isCounter) body.counterReviewerComments = feedback.counterReviewerComments
    fetch(`/api/performance/appraisals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).finally(() => setFbSaving(false))
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

      {/* SECTION 1 — Employee self-input */}
      <div style={card}>
        <h2 style={sectionTitle}>Employee&apos;s self-input</h2>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
          Context submitted by the employee (read-only).
        </div>
        {appraisal.kpis.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No KPIs.</div>
        ) : (
          appraisal.kpis.map(k => (
            <div
              key={k.id}
              style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 10 }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                {k.projectName ?? "—"} {k.weight != null && (
                  <span style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>· weight {k.weight}</span>
                )}
              </div>
              <Field label="Deliverable" value={k.deliverable} />
              <Field label="KPI" value={k.kpi} />
              <Field label="Employee score" value={k.employeeScore ?? "—"} />
              <Field label="Employee comment" value={k.employeeComment} />
            </div>
          ))
        )}
        <Field label="Query self-rating" value={appraisal.queryEmployeeRating ?? "—"} />
        <Field label="Recommendation self-rating" value={appraisal.recEmployeeRating ?? "—"} />
        <Field label="Employee comments" value={appraisal.employeeComments} />
        <Field
          label="Meeting confirmed (employee)"
          value={appraisal.meetingEmployeeConfirmed ? "Yes" : "No"}
        />
      </div>

      {/* SECTION 2 — Score the KPIs */}
      <div style={card}>
        <h2 style={sectionTitle}>Score the KPIs</h2>
        {appraisal.kpis.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No KPIs to score.</div>
        ) : (
          appraisal.kpis.map(k => (
            <div
              key={k.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{k.projectName ?? "—"}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{k.kpi ?? "—"}</div>
              </div>
              <div style={{ width: 130 }}>
                <span style={labelStyle}>Your score (0–10)</span>
                {editable ? (
                  <input
                    type="number"
                    min={0}
                    max={10}
                    style={fi}
                    value={kpiScores[k.id] ?? ""}
                    onChange={e => setKpiScores(s => ({ ...s, [k.id]: e.target.value }))}
                    onBlur={() => saveKpi(k.id)}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: "var(--foreground)" }}>
                    {(relationship.isPrimary ? k.primaryScore : k.counterScore) ?? "—"}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div style={{ marginTop: 6 }}>
          <span style={labelStyle}>Reviewer comment (shared)</span>
          {editable ? (
            <textarea
              style={{ ...fi, minHeight: 70, resize: "vertical" }}
              value={reviewerComment}
              onChange={e => setReviewerComment(e.target.value)}
              onBlur={() => appraisal.kpis[0] && saveKpi(appraisal.kpis[0].id)}
            />
          ) : (
            <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
              {appraisal.reviewerComments ?? reviewerComment ?? "—"}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3 — Core Values */}
      <div style={card}>
        <h2 style={sectionTitle}>Core Values rating</h2>
        {editable && cvQuestions.length > 0 && <ScaleLegend scaleMax={cvQuestions[0]?.scaleMax ?? 3} />}
        {cvQuestions.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No core-value questions.</div>
        ) : (
          cvQuestions.map(q => (
            <div
              key={q.id}
              style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 10 }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>{q.text}</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 150 }}>
                  <span style={labelStyle}>Score (0–{q.scaleMax})</span>
                  {editable ? (
                    <select
                      style={fi}
                      value={cvScores[q.id]?.score ?? ""}
                      onChange={e =>
                        setCvScores(s => ({ ...s, [q.id]: { ...s[q.id], score: e.target.value } }))
                      }
                    >
                      <option value="">—</option>
                      {Array.from({ length: q.scaleMax + 1 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--foreground)" }}>{cvScores[q.id]?.score || "—"}</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={labelStyle}>Comment (required)</span>
                  {editable ? (
                    <input
                      style={fi}
                      value={cvScores[q.id]?.comment ?? ""}
                      onChange={e =>
                        setCvScores(s => ({ ...s, [q.id]: { ...s[q.id], comment: e.target.value } }))
                      }
                    />
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--foreground)" }}>{cvScores[q.id]?.comment || "—"}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {cvErr && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{cvErr}</div>}
        {editable && cvQuestions.length > 0 && (
          <button style={{ ...primaryBtn, opacity: cvSaving ? 0.6 : 1 }} disabled={cvSaving} onClick={saveCoreValues}>
            {cvSaving ? "Saving…" : "Save core values"}
          </button>
        )}
      </div>

      {/* SECTION 4 — Reviewer feedback */}
      <div style={card}>
        <h2 style={sectionTitle}>Reviewer feedback (Section VII)</h2>
        {([
          ["keyAchievements", "Key achievements"],
          ["areasForImprovement", "Areas for improvement"],
          ["developmentPlan", "Development plan"],
          ["reviewerComments", "Reviewer comments"],
        ] as const).map(([key, lbl]) => (
          <div key={key} style={fieldRow}>
            <span style={labelStyle}>{lbl}</span>
            {editable ? (
              <textarea
                style={{ ...fi, minHeight: 70, resize: "vertical" }}
                value={feedback[key]}
                onChange={e => setFeedback(f => ({ ...f, [key]: e.target.value }))}
              />
            ) : (
              <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
                {appraisal[key] ?? "—"}
              </div>
            )}
          </div>
        ))}

        {relationship.isCounter && (
          <div style={fieldRow}>
            <span style={labelStyle}>Counter-reviewer comments</span>
            {editable ? (
              <textarea
                style={{ ...fi, minHeight: 70, resize: "vertical" }}
                value={feedback.counterReviewerComments}
                onChange={e => setFeedback(f => ({ ...f, counterReviewerComments: e.target.value }))}
              />
            ) : (
              <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
                {appraisal.counterReviewerComments ?? "—"}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 160 }}>
            <span style={labelStyle}>Query HR rating</span>
            {editable ? (
              <input
                type="number"
                style={fi}
                value={feedback.queryHrRating}
                onChange={e => setFeedback(f => ({ ...f, queryHrRating: e.target.value }))}
              />
            ) : (
              <div style={{ fontSize: 13, color: "var(--foreground)" }}>{appraisal.queryHrRating ?? "—"}</div>
            )}
          </div>
          <div style={{ width: 160 }}>
            <span style={labelStyle}>Recommendation HR rating</span>
            {editable ? (
              <input
                type="number"
                style={fi}
                value={feedback.recHrRating}
                onChange={e => setFeedback(f => ({ ...f, recHrRating: e.target.value }))}
              />
            ) : (
              <div style={{ fontSize: 13, color: "var(--foreground)" }}>{appraisal.recHrRating ?? "—"}</div>
            )}
          </div>
        </div>

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
          <button style={{ ...primaryBtn, opacity: fbSaving ? 0.6 : 1 }} disabled={fbSaving} onClick={saveFeedback}>
            {fbSaving ? "Saving…" : "Save feedback"}
          </button>
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
