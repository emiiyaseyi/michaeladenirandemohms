"use client"

import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { format } from "date-fns"

interface Cycle {
  id: string
  name: string
  year: number
  half: number
  startDate: string
  endDate: string
  stage: string
  isActive: boolean
}

interface MyAppraisal {
  id: string
  stage: string
  finalPercent: number | null
  finalReviewerPercent: number | null
  teamLeadPercent: number | null
}

interface Overview {
  cycle: Cycle | null
  admin: boolean
  adminStats: { total: number; byStage: Record<string, number> } | null
  myAppraisal: MyAppraisal | null
  peerPending: number
  reviewsPending: number
}

const CYCLE_STAGE_LABELS: Record<string, string> = {
  CONFIG: "Setup",
  OPEN: "Open",
  REVIEW: "Under review",
  COMPILING: "Compiling",
  FINALIZED: "Finalized",
}

const CYCLE_STAGE_COLORS: Record<string, { bg: string; fg: string }> = {
  OPEN: { bg: "#DCFCE7", fg: "#15803D" },
  REVIEW: { bg: "#FEF3C7", fg: "#B45309" },
  COMPILING: { bg: "#DBEAFE", fg: "#1D4ED8" },
  FINALIZED: { bg: "var(--muted)", fg: "var(--muted-foreground)" },
  CONFIG: { bg: "var(--muted)", fg: "var(--muted-foreground)" },
}

const APPRAISAL_STAGE_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  LEAD_REVIEWING: "Team lead reviewing",
  LEAD_DONE: "Awaiting admin",
  FINALIZED: "Final result",
}

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 20,
}

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "9px 16px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--card)",
  color: "var(--foreground)",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  )
}

export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [base, setBase] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBase(window.location.pathname.split("/performance")[0])
    }
    fetch("/api/performance/overview")
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <TrendingUp size={22} color="var(--primary)" />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Performance</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Half-year performance appraisal</p>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 24, color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</p>
      ) : !data?.cycle ? (
        <div style={{ ...cardStyle, marginTop: 24, color: "var(--muted-foreground)", fontSize: 14 }}>
          No active appraisal cycle.
        </div>
      ) : (
        <Content data={data} base={base} />
      )}
    </div>
  )
}

function Content({ data, base }: { data: Overview; base: string }) {
  const cycle = data.cycle!
  const color = CYCLE_STAGE_COLORS[cycle.stage] ?? CYCLE_STAGE_COLORS.CONFIG

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
      {/* Active cycle card */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{cycle.name}</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
              H{cycle.half} {cycle.year} · {format(new Date(cycle.startDate), "MMM d, yyyy")} – {format(new Date(cycle.endDate), "MMM d, yyyy")}
            </div>
          </div>
          <span style={{ background: color.bg, color: color.fg, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999 }}>
            {CYCLE_STAGE_LABELS[cycle.stage] ?? cycle.stage}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
        {data.admin && data.adminStats && (
          <>
            <StatCard label="Total appraisals">
              <div style={{ fontSize: 28, fontWeight: 800 }}>{data.adminStats.total}</div>
            </StatCard>
            {Object.entries(data.adminStats.byStage).map(([stage, count]) => (
              <StatCard key={stage} label={APPRAISAL_STAGE_LABELS[stage] ?? stage}>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{count}</div>
              </StatCard>
            ))}
          </>
        )}

        {data.myAppraisal && (
          <StatCard label="My appraisal">
            <div style={{ fontSize: 15, fontWeight: 700 }}>{APPRAISAL_STAGE_LABELS[data.myAppraisal.stage] ?? data.myAppraisal.stage}</div>
            {data.myAppraisal.stage === "FINALIZED" && data.myAppraisal.finalPercent != null && (
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", marginTop: 4 }}>{data.myAppraisal.finalPercent}%</div>
            )}
          </StatCard>
        )}

        {data.myAppraisal && data.myAppraisal.teamLeadPercent != null && (
          <StatCard label="Team Lead Score">
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data.myAppraisal.teamLeadPercent}%</div>
          </StatCard>
        )}

        {data.peerPending > 0 && (
          <StatCard label="Peer reviews to give">
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data.peerPending}</div>
          </StatCard>
        )}

        {data.reviewsPending > 0 && (
          <StatCard label="Appraisals to review">
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data.reviewsPending}</div>
          </StatCard>
        )}
      </div>

      {/* Quick links */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {data.admin ? (
          <>
            <a href="/admin/performance/cycles" style={linkStyle}>Manage cycles</a>
            <a href="/admin/performance/appraisals" style={linkStyle}>All appraisals</a>
          </>
        ) : (
          <>
            <a href={`${base}/performance/my`} style={linkStyle}>My appraisal</a>
            <a href={`${base}/performance/peer-reviews`} style={linkStyle}>Peer reviews</a>
            <a href={`${base}/performance/to-review`} style={linkStyle}>To review</a>
          </>
        )}
      </div>
    </div>
  )
}
