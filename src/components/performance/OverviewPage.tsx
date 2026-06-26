"use client"

import { useCallback, useEffect, useState } from "react"
import { TrendingUp, ChevronLeft, ChevronRight, BarChart3, Award, Users } from "lucide-react"
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

interface AnalyticsCycle {
  id: string
  name: string
  year: number
  half: number
  stage: string
  isActive: boolean
}

interface PerformerRow {
  id: string
  name: string
  jobTitle: string | null
  department: string | null
  percent: number | null
}

interface Analytics {
  total: number
  byStage: Record<string, number>
  participation: {
    submitted: number
    reviewed: number
    finalized: number
    peersAssigned: number
    peersSubmitted: number
    reviewersAssigned: number
    reviewersSubmitted: number
  }
  averages: {
    finalPercent: number | null
    employeePercent: number | null
    behavioural360: number | null
    jobScoreRev: number | null
    coreScoreRev: number | null
    teamLeadPercent: number | null
  }
  distribution: { label: string; count: number }[]
  top: PerformerRow[]
  bottom: PerformerRow[]
  byDepartment: { name: string; avg: number | null; count: number }[]
}

interface AnalyticsResponse {
  cycles: AnalyticsCycle[]
  cycle: AnalyticsCycle | null
  analytics: Analytics | null
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
        data.admin ? <AdminDashboard /> : <Content data={data} base={base} />
      )}
    </div>
  )
}

const badgeStyle = (stage: string): React.CSSProperties => {
  const color = CYCLE_STAGE_COLORS[stage] ?? CYCLE_STAGE_COLORS.CONFIG
  return { background: color.bg, color: color.fg, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999 }
}

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--card)",
  color: "var(--foreground)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}

function fmt(n: number | null | undefined): string {
  return n == null ? "-" : String(n)
}

function AdminDashboard() {
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [res, setRes] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback((id: string | null) => {
    setLoading(true)
    const url = id ? `/api/performance/analytics?cycleId=${encodeURIComponent(id)}` : "/api/performance/analytics"
    fetch(url)
      .then(r => r.json())
      .then((d: AnalyticsResponse) => setRes(d))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(cycleId)
  }, [cycleId, load])

  if (loading && !res) {
    return <div style={{ ...cardStyle, marginTop: 8, color: "var(--muted-foreground)", fontSize: 13 }}>Loading analytics…</div>
  }

  const cycles = res?.cycles ?? []
  const cycle = res?.cycle ?? null
  const analytics = res?.analytics ?? null

  if (!cycle || !analytics) {
    return <div style={{ ...cardStyle, marginTop: 8, color: "var(--muted-foreground)", fontSize: 14 }}>No cycles to analyse yet.</div>
  }

  const idx = cycles.findIndex(c => c.id === cycle.id)
  const atStart = idx <= 0
  const atEnd = idx < 0 || idx >= cycles.length - 1
  // cycles is newest-first. "Prev" (older) moves toward the end of the array; "Next" (newer) moves toward the start.
  const goNewer = () => { if (idx > 0) setCycleId(cycles[idx - 1].id) }
  const goOlder = () => { if (idx >= 0 && idx < cycles.length - 1) setCycleId(cycles[idx + 1].id) }

  const downloadCsv = () => {
    if (typeof window === "undefined") return
    const a = analytics.averages
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows: string[][] = []
    rows.push(["Cycle", cycle.name])
    rows.push(["Year / Half", `${cycle.year}`, `H${cycle.half}`])
    rows.push(["Stage", CYCLE_STAGE_LABELS[cycle.stage] ?? cycle.stage])
    rows.push(["Total appraisals", `${analytics.total}`])
    rows.push(["Submitted", `${analytics.participation.submitted}`])
    rows.push(["Reviewed", `${analytics.participation.reviewed}`])
    rows.push(["Finalized", `${analytics.participation.finalized}`])
    rows.push([])
    rows.push(["Averages"])
    rows.push(["Final %", fmt(a.finalPercent)])
    rows.push(["Employee self %", fmt(a.employeePercent)])
    rows.push(["360 Behavioural / 5", fmt(a.behavioural360)])
    rows.push(["Job (Reviewer) / 100", fmt(a.jobScoreRev)])
    rows.push(["Core Values (Reviewer)", fmt(a.coreScoreRev)])
    rows.push(["Team Lead %", fmt(a.teamLeadPercent)])
    rows.push([])
    rows.push(["Score distribution"])
    rows.push(["Band", "Count"])
    analytics.distribution.forEach(d => rows.push([d.label, `${d.count}`]))
    rows.push([])
    rows.push(["Top performers"])
    rows.push(["Name", "Department", "Job title", "Percent"])
    analytics.top.forEach(p => rows.push([p.name, p.department ?? "", p.jobTitle ?? "", fmt(p.percent)]))
    rows.push([])
    rows.push(["Needs attention"])
    rows.push(["Name", "Department", "Job title", "Percent"])
    analytics.bottom.forEach(p => rows.push([p.name, p.department ?? "", p.jobTitle ?? "", fmt(p.percent)]))

    const csv = rows.map(r => r.map(esc).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const href = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = href
    link.download = `appraisal-report-${cycle.year}-H${cycle.half}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
  }

  const p = analytics.participation
  const av = analytics.averages
  const finalizedPct = analytics.total > 0 ? Math.round((p.finalized / analytics.total) * 100) : 0
  const maxBand = Math.max(1, ...analytics.distribution.map(d => d.count))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <BarChart3 size={20} color="var(--primary)" />
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>Analytics</h2>
      </div>

      {/* Cycle selector bar */}
      <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{cycle.name} · H{cycle.half} {cycle.year}</div>
          <span style={badgeStyle(cycle.stage)}>{CYCLE_STAGE_LABELS[cycle.stage] ?? cycle.stage}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <a href="/admin/performance/cycles" style={{ ...btnStyle, textDecoration: "none" }}>Manage cycles</a>
          <a href="/admin/performance/appraisals" style={{ ...btnStyle, textDecoration: "none" }}>All appraisals</a>
          <button type="button" onClick={goOlder} disabled={atEnd} style={{ ...btnStyle, opacity: atEnd ? 0.4 : 1, cursor: atEnd ? "not-allowed" : "pointer" }}>
            <ChevronLeft size={15} /> Prev
          </button>
          <button type="button" onClick={goNewer} disabled={atStart} style={{ ...btnStyle, opacity: atStart ? 0.4 : 1, cursor: atStart ? "not-allowed" : "pointer" }}>
            Next <ChevronRight size={15} />
          </button>
          <button type="button" onClick={downloadCsv} style={btnStyle}>Download report (CSV)</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16 }}>
        <StatCard label="Total appraisals">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{analytics.total}</div>
        </StatCard>
        <StatCard label="Submitted">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{p.submitted}<span style={{ fontSize: 14, color: "var(--muted-foreground)", fontWeight: 600 }}>/{analytics.total}</span></div>
        </StatCard>
        <StatCard label="Reviewed">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{p.reviewed}</div>
        </StatCard>
        <StatCard label="Finalized">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{p.finalized}<span style={{ fontSize: 14, color: "var(--muted-foreground)", fontWeight: 600 }}> · {finalizedPct}%</span></div>
        </StatCard>
        <StatCard label="Avg final score">
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{fmt(av.finalPercent)}{av.finalPercent != null && "%"}</div>
        </StatCard>
        <StatCard label="Avg Team Lead score">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(av.teamLeadPercent)}{av.teamLeadPercent != null && "%"}</div>
        </StatCard>
      </div>

      {/* Section averages */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
        <SmallStat label="360 Behavioural" value={`${fmt(av.behavioural360)} / 5`} />
        <SmallStat label="Job (Reviewer)" value={`${fmt(av.jobScoreRev)} / 100`} />
        <SmallStat label="Core Values (Reviewer)" value={fmt(av.coreScoreRev)} />
        <SmallStat label="Employee self avg" value={`${fmt(av.employeePercent)}${av.employeePercent != null ? "%" : ""}`} />
        <SmallStat label="Final (Reviewer) avg" value={`${fmt(av.finalPercent)}${av.finalPercent != null ? "%" : ""}`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
        {/* Score distribution */}
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Score distribution</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analytics.distribution.map(d => (
              <div key={d.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>
                  <span>{d.label}</span>
                  <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{d.count}</span>
                </div>
                <div style={{ height: 10, background: "var(--muted)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(d.count / maxBand) * 100}%`, background: "var(--primary)", borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage breakdown */}
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Stage breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(analytics.byStage).map(([stage, count]) => (
              <div key={stage} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--muted-foreground)" }}>{APPRAISAL_STAGE_LABELS[stage] ?? stage}</span>
                <span style={{ fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Participation */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          <Users size={16} color="var(--primary)" /> Participation
        </div>
        <ProgressLine label="Peer reviews" done={p.peersSubmitted} total={p.peersAssigned} />
        <div style={{ height: 12 }} />
        <ProgressLine label="Reviewer submissions" done={p.reviewersSubmitted} total={p.reviewersAssigned} />
      </div>

      {/* Top / Bottom */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
        <PerformerCard title="Top performers" icon={<Award size={16} color="var(--primary)" />} rows={analytics.top} />
        <PerformerCard title="Needs attention" icon={<TrendingUp size={16} color="var(--primary)" />} rows={analytics.bottom} />
      </div>

      {/* By department */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>By department</div>
        {analytics.byDepartment.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No data.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {analytics.byDepartment.map(d => (
              <div key={d.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                <span>{d.name}</span>
                <span style={{ color: "var(--muted-foreground)" }}>{fmt(d.avg)}% (n={d.count})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...cardStyle, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  )
}

function ProgressLine({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{done}/{total}</span>
      </div>
      <div style={{ height: 6, background: "var(--muted)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", borderRadius: 999 }} />
      </div>
    </div>
  )
}

function PerformerCard({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: PerformerRow[] }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
        {icon} {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No finalized appraisals yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
              <span>
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                {r.department && <span style={{ color: "var(--muted-foreground)" }}> · {r.department}</span>}
              </span>
              <span style={{ fontWeight: 700, color: "var(--primary)" }}>{fmt(r.percent)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Content({ data, base }: { data: Overview; base: string }) {
  const cycle = data.cycle!
  const color = CYCLE_STAGE_COLORS[cycle.stage] ?? CYCLE_STAGE_COLORS.CONFIG

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
      {/* Active cycle card - non-admin only (admins get the cycle selector in Analytics). */}
      {!data.admin && (
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
      )}

      {/* Personal stat cards (admin's aggregate stats live in the Analytics dashboard below). */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
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
