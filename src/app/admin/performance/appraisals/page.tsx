"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ClipboardList, Loader2, ArrowRight } from "lucide-react"

const STAGE_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started", DRAFT: "Draft", SUBMITTED: "Submitted",
  LEAD_REVIEWING: "Team lead reviewing", LEAD_DONE: "Awaiting admin", FINALIZED: "Final result",
}
const STAGE_ORDER = ["NOT_STARTED", "DRAFT", "SUBMITTED", "LEAD_REVIEWING", "LEAD_DONE", "FINALIZED"]

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

type Cycle = { id: string; name: string; year: number; half: number; stage: string; isActive: boolean }
type Person = { id?: string; firstName: string; lastName: string; jobTitle?: string | null; profilePhoto?: string | null }
type Appraisal = {
  id: string; stage: string
  finalPercent: number | null; finalReviewerPercent: number | null; teamLeadPercent: number | null
  employee: Person
  reviewers: { role: string; reviewer: Person }[]
  _count: { peers: number; ratings: number }
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    NOT_STARTED: { bg: "var(--muted)", fg: "var(--muted-foreground)" },
    DRAFT: { bg: "var(--muted)", fg: "var(--muted-foreground)" },
    SUBMITTED: { bg: "rgba(34,197,94,0.15)", fg: "var(--primary)" },
    LEAD_REVIEWING: { bg: "rgba(59,130,246,0.15)", fg: "#2563EB" },
    LEAD_DONE: { bg: "rgba(245,158,11,0.15)", fg: "#B45309" },
    FINALIZED: { bg: "rgba(99,102,241,0.15)", fg: "#4F46E5" },
  }
  const c = colors[stage] ?? colors.NOT_STARTED
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block" }}>
      {STAGE_LABELS[stage] ?? stage}
    </span>
  )
}

function fullName(p?: Person | null) {
  if (!p) return "—"
  return `${p.firstName} ${p.lastName}`.trim() || "—"
}

export default function AppraisalsListPage() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [cycleId, setCycleId] = useState<string>("")
  const [appraisals, setAppraisals] = useState<Appraisal[]>([])
  const [loadingCycles, setLoadingCycles] = useState(true)
  const [loading, setLoading] = useState(false)
  const [stageFilter, setStageFilter] = useState<string>("")
  const [sort, setSort] = useState<{ key: "finalPercent" | "teamLeadPercent"; dir: "asc" | "desc" } | null>(null)

  useEffect(() => {
    (async () => {
      setLoadingCycles(true)
      try {
        const res = await fetch("/api/performance/cycles")
        const data = await res.json()
        const list: Cycle[] = data.cycles ?? []
        setCycles(list)
        const initial = list.find(c => c.isActive) ?? list[0]
        if (initial) setCycleId(initial.id)
      } finally {
        setLoadingCycles(false)
      }
    })()
  }, [])

  const load = useCallback(async () => {
    if (!cycleId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/performance/appraisals?cycleId=${cycleId}&scope=all`)
      const data = await res.json()
      setAppraisals(data.appraisals ?? [])
    } finally {
      setLoading(false)
    }
  }, [cycleId])

  useEffect(() => { load() }, [load])

  const counts: Record<string, number> = {}
  for (const a of appraisals) counts[a.stage] = (counts[a.stage] ?? 0) + 1

  // Stage filter + optional sort by a results column (nulls always last).
  const rows = (() => {
    const list = stageFilter ? appraisals.filter(a => a.stage === stageFilter) : appraisals.slice()
    if (sort) {
      const { key, dir } = sort
      list.sort((a, b) => {
        const av = a[key], bv = b[key]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        return dir === "asc" ? av - bv : bv - av
      })
    }
    return list
  })()

  const toggleSort = (key: "finalPercent" | "teamLeadPercent") =>
    setSort(s => (s?.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }))
  const sortArrow = (key: "finalPercent" | "teamLeadPercent") => (sort?.key === key ? (sort.dir === "desc" ? " ↓" : " ↑") : " ⇅")

  const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "12px", fontSize: 13, color: "var(--foreground)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }
  const num = (v: number | null) => (v === null || v === undefined ? "—" : `${v}%`)

  const primaryOf = (a: Appraisal) => a.reviewers.find(r => r.role === "PRIMARY")?.reviewer
  const counterOf = (a: Appraisal) => a.reviewers.find(r => r.role === "COUNTER")?.reviewer

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <ClipboardList size={26} style={{ color: "var(--primary)", marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Appraisals</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Review, compile and finalize employee appraisals.</p>
        </div>
        <select
          style={{ ...fi, width: "auto", minWidth: 220 }}
          value={cycleId}
          disabled={loadingCycles}
          onChange={e => setCycleId(e.target.value)}
        >
          {cycles.length === 0 && <option value="">No cycles</option>}
          {cycles.map(c => (
            <option key={c.id} value={c.id}>{c.name}{c.isActive ? " (active)" : ""}</option>
          ))}
        </select>
      </div>

      {/* Summary strip — click a card to filter by that stage */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <button
          onClick={() => setStageFilter("")}
          style={{ textAlign: "left", cursor: "pointer", background: stageFilter === "" ? "var(--primary)" : "var(--card)", border: `1px solid ${stageFilter === "" ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, padding: "10px 14px", minWidth: 110 }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: stageFilter === "" ? "white" : "var(--foreground)" }}>{appraisals.length}</div>
          <div style={{ fontSize: 11.5, color: stageFilter === "" ? "rgba(255,255,255,0.85)" : "var(--muted-foreground)", fontWeight: 600 }}>All</div>
        </button>
        {STAGE_ORDER.map(s => {
          const active = stageFilter === s
          return (
            <button
              key={s}
              onClick={() => setStageFilter(active ? "" : s)}
              style={{ textAlign: "left", cursor: "pointer", background: active ? "var(--primary)" : "var(--card)", border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, padding: "10px 14px", minWidth: 110 }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: active ? "white" : "var(--foreground)" }}>{counts[s] ?? 0}</div>
              <div style={{ fontSize: 11.5, color: active ? "rgba(255,255,255,0.85)" : "var(--muted-foreground)", fontWeight: 600 }}>{STAGE_LABELS[s]}</div>
            </button>
          )
        })}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {loadingCycles || loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : appraisals.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No appraisals in this cycle.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Subject</th>
                <th style={th}>Stage</th>
                <th style={th}>Primary reviewer</th>
                <th style={th}>Counter reviewer</th>
                <th style={{ ...th, textAlign: "right" }}>Peers</th>
                <th style={{ ...th, textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort("finalPercent")}>Final %{sortArrow("finalPercent")}</th>
                <th style={{ ...th, textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort("teamLeadPercent")}>Team Lead %{sortArrow("teamLeadPercent")}</th>
                <th style={{ ...th, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{fullName(a.employee)}</div>
                    {a.employee.jobTitle && <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{a.employee.jobTitle}</div>}
                  </td>
                  <td style={td}><StageBadge stage={a.stage} /></td>
                  <td style={td}>{fullName(primaryOf(a))}</td>
                  <td style={td}>{fullName(counterOf(a))}</td>
                  <td style={{ ...td, textAlign: "right" }}>{a._count?.peers ?? 0}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{num(a.finalPercent)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{num(a.teamLeadPercent)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Link href={`/admin/performance/appraisals/${a.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--background)", color: "var(--foreground)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                      Open <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td style={{ ...td, textAlign: "center", color: "var(--muted-foreground)" }} colSpan={8}>No appraisals at the “{STAGE_LABELS[stageFilter] ?? stageFilter}” stage.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
