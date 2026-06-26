"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { format } from "date-fns"

interface Subject {
  id: string
  firstName: string
  lastName: string
  jobTitle?: string | null
  profilePhoto?: string | null
}

interface Review {
  reviewerRowId: string
  role: "PRIMARY" | "COUNTER"
  submittedAt?: string | null
  appraisalId: string
  stage: string
  subject: Subject
  cycle: { id: string; name: string; stage: string; year?: number; half?: string }
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

const STAGE_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  LEAD_REVIEWING: "In review",
  LEAD_DONE: "Reviewed",
  FINALIZED: "Finalized",
}

function roleLabel(role: string) {
  return role === "PRIMARY" ? "Primary reviewer" : "Counter reviewer"
}

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "primary" }) {
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        display: "inline-block",
        background: tone === "primary" ? "var(--primary)" : "var(--muted)",
        color: tone === "primary" ? "white" : "var(--muted-foreground)",
      }}
    >
      {children}
    </span>
  )
}

export default function ToReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [base, setBase] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBase(window.location.pathname.split("/performance")[0])
    }
    fetch("/api/performance/to-review")
      .then(r => r.json())
      .then(d => setReviews(d?.reviews ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Star size={22} color="var(--primary)" />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0, lineHeight: 1.2 }}>
            Appraisals to Review
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0 0" }}>
            Staff appraisals assigned to you as a reviewer
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ ...cardStyle, color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
      ) : reviews.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, padding: 40 }}>
          No appraisals assigned to you.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map(rv => {
            const actionable = rv.cycle.stage === "REVIEW"
            const label = actionable ? (rv.submittedAt ? "Open" : "Review") : "View"
            return (
              <div
                key={rv.reviewerRowId}
                style={{
                  ...cardStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
                    {rv.subject.firstName} {rv.subject.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                    {rv.subject.jobTitle ?? "-"}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                    <Pill tone="primary">{roleLabel(rv.role)}</Pill>
                    <Pill>{rv.cycle.name}</Pill>
                    <Pill>{STAGE_LABEL[rv.stage] ?? rv.stage}</Pill>
                    <span style={{ fontSize: 12, fontWeight: 600, color: rv.submittedAt ? "var(--primary)" : "var(--muted-foreground)" }}>
                      {rv.submittedAt ? "Submitted ✓" : "Pending"}
                    </span>
                    {rv.submittedAt && (
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                        {format(new Date(rv.submittedAt), "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  style={primaryBtn}
                  onClick={() => {
                    window.location.href = `${base}/performance/to-review/${rv.appraisalId}`
                  }}
                >
                  {label}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
