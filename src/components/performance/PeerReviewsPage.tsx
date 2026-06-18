"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Users } from "lucide-react"

interface Subject {
  id?: string
  firstName: string
  lastName: string
  jobTitle?: string | null
  profilePhoto?: string | null
}

interface PeerTask {
  peerAssignmentId: string
  status: string
  appraisalId: string
  subject: Subject
  cycle: { id: string; name: string; stage?: string }
}

interface Data {
  tasks: PeerTask[]
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

function statusLabel(status: string) {
  return status === "SUBMITTED" ? "Submitted ✓" : "To do"
}

export default function PeerReviewsPage() {
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [base, setBase] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBase(window.location.pathname.split("/performance")[0])
    }
    fetch("/api/performance/peer-reviews")
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  const tasks = data?.tasks ?? []

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Users size={22} color="var(--primary)" />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Peer Reviews</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Anonymous reviews you&apos;ve been asked to give</p>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 24, color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
          {tasks.length === 0 ? (
            <div style={{ ...cardStyle, color: "var(--muted-foreground)", fontSize: 14 }}>
              No peer reviews to give right now.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
              {tasks.map(task => (
                <div key={task.peerAssignmentId} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {task.subject.firstName} {task.subject.lastName}
                      </div>
                      {task.subject.jobTitle && (
                        <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{task.subject.jobTitle}</div>
                      )}
                    </div>
                    <span style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>
                      {statusLabel(task.status)}
                    </span>
                  </div>
                  <button
                    style={{ ...primaryBtn, marginTop: 16, width: "100%" }}
                    onClick={() => router.push(`${base}/performance/peer-reviews/${task.appraisalId}?type=PEER`)}
                  >
                    {task.status === "SUBMITTED" ? "Edit" : "Rate"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Your ratings are anonymous to the person being reviewed.
          </p>
        </div>
      )}
    </div>
  )
}
