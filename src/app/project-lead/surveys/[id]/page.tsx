"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"

type QuestionType = "TEXT" | "MULTIPLE_CHOICE" | "RATING" | "YES_NO"

interface Question {
  id: string
  text: string
  qType: QuestionType
  options: string[]
  required: boolean
  order: number
}

interface Survey {
  id: string
  title: string
  type: string
  isAnonymous: boolean
  questions: Question[]
}

export default function PLTakeSurveyPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch(`/api/surveys/${id}`)
      .then(r => r.json())
      .then(d => { setSurvey(d.survey); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const setAnswer = (qId: string, val: string) => {
    setAnswers(p => ({ ...p, [qId]: val }))
    setErrors(p => ({ ...p, [qId]: false }))
  }

  const submit = async () => {
    if (!survey) return
    const newErrors: Record<string, boolean> = {}
    for (const q of survey.questions) {
      if (q.required && !answers[q.id]?.trim()) newErrors[q.id] = true
    }
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    setSubmitting(true)
    try {
      await fetch(`/api/surveys/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #D1D5DB",
    borderRadius: 8, fontSize: 13, outline: "none",
    background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box",
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>
  if (!survey) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Survey not found.</div>

  if (submitted) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Response Submitted</h2>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24 }}>Thank you for completing the survey.</p>
        <button onClick={() => router.push("/project-lead/surveys")} style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Back to Surveys
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push("/project-lead/surveys")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <ChevronLeft size={18} style={{ color: "var(--muted-foreground)" }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Surveys</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 14 }}>›</span>
        <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{survey.title}</span>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{survey.title}</h1>
          {survey.isAnonymous && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>This survey is anonymous. Your identity will not be recorded.</p>}
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
          {survey.questions.map((q, idx) => (
            <div key={q.id}>
              <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 10 }}>
                {idx + 1}. {q.text}
                {q.required && <span style={{ color: "#EF4444", marginLeft: 4 }}>*</span>}
              </label>

              {q.qType === "TEXT" && (
                <textarea value={answers[q.id] ?? ""} onChange={e => setAnswer(q.id, e.target.value)} rows={3}
                  style={{ ...inputStyle, border: `1px solid ${errors[q.id] ? "#EF4444" : "#D1D5DB"}`, resize: "vertical" }} />
              )}

              {q.qType === "MULTIPLE_CHOICE" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.options.filter(Boolean).map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                        onChange={() => setAnswer(q.id, opt)} style={{ accentColor: "var(--primary)" }} />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {q.qType === "YES_NO" && (
                <div style={{ display: "flex", gap: 20 }}>
                  {["Yes", "No"].map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                        onChange={() => setAnswer(q.id, opt)} style={{ accentColor: "var(--primary)" }} />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {q.qType === "RATING" && (
                <div style={{ display: "flex", gap: 10 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setAnswer(q.id, String(n))} style={{
                      width: 44, height: 44, borderRadius: 8,
                      border: `2px solid ${answers[q.id] === String(n) ? "var(--primary)" : "#D1D5DB"}`,
                      background: answers[q.id] === String(n) ? "#EFF6FF" : "var(--background)",
                      color: answers[q.id] === String(n) ? "var(--primary)" : "var(--foreground)",
                      fontSize: 14, fontWeight: 700, cursor: "pointer",
                    }}>
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {errors[q.id] && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>This field is required</p>}
            </div>
          ))}
        </div>

        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={() => router.push("/project-lead/surveys")} style={{ padding: "9px 24px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={submitting} style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  )
}
