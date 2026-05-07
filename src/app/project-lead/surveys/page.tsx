"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Inbox, ClipboardList } from "lucide-react"

type SurveyType = "GENERAL" | "CONFIRMATION" | "EXIT"

interface Survey {
  id: string
  title: string
  type: SurveyType
  isAnonymous: boolean
  status: "DRAFT" | "ACTIVE" | "CLOSED"
  dueDate?: string
  _count: { questions: number; responses: number }
}

const TYPE_LABELS: Record<SurveyType, string> = {
  GENERAL: "General",
  CONFIRMATION: "Confirmation",
  EXIT: "Exit",
}

const TYPE_COLORS: Record<SurveyType, { bg: string; color: string }> = {
  GENERAL:      { bg: "#EFF6FF", color: "var(--primary)" },
  CONFIRMATION: { bg: "#F0FDF4", color: "#16A34A" },
  EXIT:         { bg: "#FFF7ED", color: "#EA580C" },
}

export default function ProjectLeadSurveysPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/surveys")
      .then(r => r.json())
      .then(d => { setSurveys((d.surveys ?? []).filter((s: Survey) => s.status === "ACTIVE")); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Surveys</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Active surveys available for you to complete</p>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
      ) : surveys.length === 0 ? (
        <div style={{ padding: 80, textAlign: "center" }}>
          <Inbox size={40} strokeWidth={1} style={{ color: "#D1D5DB", display: "block", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>No active surveys at the moment</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {surveys.map(s => {
            const tc = TYPE_COLORS[s.type]
            return (
              <div key={s.id} style={{
                background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
                padding: 20, display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ClipboardList size={18} style={{ color: tc.color }} />
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.color }}>
                    {TYPE_LABELS[s.type]}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {s._count.questions} question{s._count.questions !== 1 ? "s" : ""}
                    {s.isAnonymous && " · Anonymous"}
                    {s.dueDate && ` · Due ${new Date(s.dueDate).toLocaleDateString()}`}
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/project-lead/surveys/${s.id}`)}
                  style={{ padding: "8px 0", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Take Survey
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
