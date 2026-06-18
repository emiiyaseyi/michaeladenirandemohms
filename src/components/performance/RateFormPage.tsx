"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Star } from "lucide-react"
import { ScaleLegend, validateRatings } from "@/components/performance/scale"

interface Question {
  id: string
  text: string
  scaleMax: number
  order: number
}

interface Rating {
  questionId: string
  score: number | null
  comment: string
}

interface Data {
  subject: { firstName: string; lastName: string; jobTitle?: string | null }
  cycle: { id: string; name: string; stage?: string }
  section: string
  questions: Question[]
  myRatings: { questionId: string; score: number; comment?: string | null }[]
}

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 20,
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

export default function RateFormPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const sp = useSearchParams()
  const raterType = sp.get("type") === "MEMBER" ? "MEMBER" : "PEER"

  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [notAvailable, setNotAvailable] = useState(false)
  const [ratings, setRatings] = useState<Record<string, Rating>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [base, setBase] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBase(window.location.pathname.split("/performance")[0])
    }
    fetch(`/api/performance/appraisals/${id}/rate?raterType=${raterType}`)
      .then(r => {
        if (r.status === 404 || r.status === 403) {
          setNotAvailable(true)
          return null
        }
        return r.json()
      })
      .then((d: Data | null) => {
        if (!d) return
        setData(d)
        const map: Record<string, Rating> = {}
        for (const q of d.questions ?? []) {
          const existing = (d.myRatings ?? []).find(r => r.questionId === q.id)
          map[q.id] = {
            questionId: q.id,
            score: existing?.score ?? null,
            comment: existing?.comment ?? "",
          }
        }
        setRatings(map)
      })
      .finally(() => setLoading(false))
  }, [id, raterType])

  const listUrl = `${base}/performance/peer-reviews`

  function setScore(qid: string, score: number) {
    setRatings(prev => ({ ...prev, [qid]: { ...prev[qid], questionId: qid, score } }))
  }

  function setComment(qid: string, comment: string) {
    setRatings(prev => ({ ...prev, [qid]: { ...prev[qid], questionId: qid, comment } }))
  }

  async function submit() {
    if (!data) return
    const rows = data.questions.map(q => ({ score: ratings[q.id]?.score ?? null, comment: ratings[q.id]?.comment ?? "" }))
    const v = validateRatings(rows)
    if (v) { setError(v); return }
    setSubmitting(true)
    setError("")
    const payload = {
      section: data.section,
      raterType,
      ratings: data.questions.map(q => ({
        questionId: q.id,
        score: ratings[q.id]?.score ?? null,
        comment: (ratings[q.id]?.comment ?? "").trim(),
      })),
      submit: true,
    }
    try {
      const res = await fetch(`/api/performance/appraisals/${id}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? "Failed to submit review.")
        setSubmitting(false)
        return
      }
      router.push(listUrl)
    } catch {
      setError("Failed to submit review.")
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <a href={listUrl} style={{ fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none" }}>
        ← Back
      </a>

      {loading ? (
        <p style={{ marginTop: 24, color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</p>
      ) : notAvailable || !data ? (
        <div style={{ ...cardStyle, marginTop: 24, color: "var(--muted-foreground)", fontSize: 14 }}>
          This review isn&apos;t available. <a href={listUrl} style={{ color: "var(--primary)", fontWeight: 600 }}>Back to peer reviews</a>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <Star size={22} color="var(--primary)" />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800 }}>
                {raterType === "MEMBER" ? "Rate your team lead" : "Peer review"}
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                {data.subject.firstName} {data.subject.lastName}
                {data.subject.jobTitle ? ` · ${data.subject.jobTitle}` : ""}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 8 }}>
            Anonymous — only HR can see who submitted this. A comment is required for every item.
          </p>

          <div style={{ marginTop: 16 }}><ScaleLegend scaleMax={data.questions[0]?.scaleMax ?? 5} /></div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
            {data.questions.map(q => {
              const r = ratings[q.id]
              return (
                <div key={q.id} style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{q.text}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {Array.from({ length: q.scaleMax + 1 }, (_, n) => {
                      const selected = r?.score === n
                      return (
                        <button
                          key={n}
                          onClick={() => setScore(q.id, n)}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 700,
                            border: selected ? "none" : "1px solid var(--border)",
                            background: selected ? "var(--primary)" : "var(--background)",
                            color: selected ? "white" : "var(--foreground)",
                          }}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                  <input
                    value={r?.comment ?? ""}
                    onChange={e => setComment(q.id, e.target.value)}
                    placeholder="Comment (required)"
                    style={{
                      marginTop: 12,
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                      fontSize: 13,
                    }}
                  />
                </div>
              )
            })}
          </div>

          {error && (
            <p style={{ marginTop: 16, color: "#DC2626", fontSize: 13 }}>{error}</p>
          )}

          <div style={{ marginTop: 24 }}>
            <button style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }} disabled={submitting} onClick={submit}>
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
