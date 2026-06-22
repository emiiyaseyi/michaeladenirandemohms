"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { UserCheck } from "lucide-react"

interface Subject {
  id?: string
  firstName: string
  lastName: string
  jobTitle?: string | null
  profilePhoto?: string | null
}

interface LeadTask {
  appraisalId: string
  subject: Subject
  cycle: { id: string; name: string }
  submitted: boolean
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

export default function TeamLeadReviewPage() {
  const router = useRouter()
  const [leadTask, setLeadTask] = useState<LeadTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [base, setBase] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBase(window.location.pathname.split("/performance")[0])
    }
    fetch("/api/performance/peer-reviews")
      .then(r => r.json())
      .then(d => setLeadTask(d.leadTask ?? null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <UserCheck size={22} color="var(--primary)" />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Team Lead Review</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Rate your team lead — anonymous to them, visible to HR</p>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 24, color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
          {!leadTask ? (
            <div style={{ ...cardStyle, color: "var(--muted-foreground)", fontSize: 14 }}>
              No team lead review to give right now.
            </div>
          ) : (
            <div style={{ ...cardStyle, borderColor: "var(--primary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Rate your team lead
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
                    {leadTask.subject.firstName} {leadTask.subject.lastName}
                  </div>
                  {leadTask.subject.jobTitle && (
                    <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{leadTask.subject.jobTitle}</div>
                  )}
                  {leadTask.submitted && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginTop: 8 }}>Submitted ✓</div>
                  )}
                </div>
                <button
                  style={primaryBtn}
                  onClick={() => router.push(`${base}/performance/team-lead-review/${leadTask.appraisalId}?type=MEMBER`)}
                >
                  {leadTask.submitted ? "View" : "Rate"}
                </button>
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Your ratings are anonymous to your team lead.
          </p>
        </div>
      )}
    </div>
  )
}
