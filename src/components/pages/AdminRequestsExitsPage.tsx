"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { Search, ChevronDown, Check, Loader2, X, MoreHorizontal, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/hooks/useCurrentUser"

interface ExitRequest {
  id: string
  exitType: string
  intendedLastDay: string
  reason: string | null
  status: string
  declineReason: string | null
  createdAt: string
  reviewedAt: string | null
  reviewedBy: { name: string } | null
  employee: {
    id: string
    firstName: string
    lastName: string
    jobTitle: string | null
    profilePhoto: string | null
    employeeId: string
    department: { name: string } | null
  }
}

const EXIT_LABEL: Record<string, string> = {
  RESIGNATION: "Resignation",
  RETIREMENT: "Retirement",
  CONTRACT_END: "Contract End",
  REDUNDANCY: "Redundancy",
  TERMINATION: "Termination",
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:  { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
  APPROVED: { bg: "#DCFCE7", color: "#16a34a", label: "Approved" },
  DECLINED: { bg: "#FEE2E2", color: "#DC2626", label: "Declined" },
}

const STATUS_OPTS = [
  { value: "", label: "To Review" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
]

function Av({ name, photo, size = 32 }: { name: string; photo?: string | null; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 800, color: "white", flexShrink: 0 }}>{initials}</div>
}

function ReviewPanel({ req, onClose, onDone }: { req: ExitRequest; onClose: () => void; onDone: () => void }) {
  const [declineReason, setDeclineReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const fullName = `${req.employee.firstName} ${req.employee.lastName}`
  const lastDay = new Date(req.intendedLastDay).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const submitted = new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  const act = async (action: "APPROVE" | "DECLINE") => {
    if (action === "DECLINE" && !declineReason.trim()) { setErr("Please provide a decline reason"); return }
    setSaving(true); setErr("")
    const r = await fetch(`/api/requests/exits/${req.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, declineReason: action === "DECLINE" ? declineReason : undefined }),
    })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    onDone()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div className="side-panel" style={{ background: "var(--card)", width: 520, height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Exit Request</h3>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{EXIT_LABEL[req.exitType] ?? req.exitType}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: "20px 24px", flex: 1 }}>
          {/* Employee info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "14px 16px", background: "var(--muted)", borderRadius: 10 }}>
            <Av name={fullName} photo={req.employee.profilePhoto} size={44} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{fullName}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{req.employee.jobTitle ?? "—"} · {req.employee.department?.name ?? "—"}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{req.employee.employeeId}</div>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {[
              ["Exit Type", EXIT_LABEL[req.exitType] ?? req.exitType],
              ["Intended Last Day", lastDay],
              ["Date Submitted", submitted],
              ["Status", <span key="s" style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: STATUS_STYLE[req.status]?.bg, color: STATUS_STYLE[req.status]?.color }}>{STATUS_STYLE[req.status]?.label ?? req.status}</span>],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 14 }}>{v}</div>
              </div>
            ))}
            {req.reason && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Reason</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{req.reason}</div>
              </div>
            )}
            {req.status === "DECLINED" && req.declineReason && (
              <div style={{ padding: "12px 14px", background: "#FEE2E2", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Decline Reason</div>
                <div style={{ fontSize: 14, color: "#DC2626", lineHeight: 1.6 }}>{req.declineReason}</div>
              </div>
            )}
            {req.reviewedBy && req.status !== "PENDING" && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Reviewed By</div>
                <div style={{ fontSize: 14 }}>{req.reviewedBy.name}</div>
              </div>
            )}
          </div>

          {/* Actions for pending */}
          {req.status === "PENDING" && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Decline reason <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>(required to decline)</span></label>
                <textarea value={declineReason} onChange={e => { setDeclineReason(e.target.value); setErr("") }}
                  rows={3} placeholder="Provide reason if declining…"
                  style={{ width: "100%", padding: "9px 13px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              {err && <div style={{ marginBottom: 12, fontSize: 12, color: "#DC2626" }}>{err}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => act("DECLINE")} disabled={saving}
                  style={{ flex: 1, padding: "10px 0", background: "none", border: "1px solid #DC2626", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "#DC2626" }}>
                  Decline
                </button>
                <button onClick={() => act("APPROVE")} disabled={saving}
                  style={{ flex: 1, padding: "10px 0", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : null} Approve
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function AdminRequestsExitsPage() {
  const { user } = useCurrentUser()
  const router = useRouter()
  const [requests, setRequests] = useState<ExitRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [reviewReq, setReviewReq] = useState<ExitRequest | null>(null)
  const [page, setPage] = useState(1)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    const h = (e: MouseEvent) => { if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [filterOpen])

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/requests/exits")
    if (r.ok) { const d = await r.json(); setRequests(d.requests ?? []) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = requests.filter(r => {
    const nameMatch = search ? `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase().includes(search.toLowerCase()) : true
    const statusMatch = statusFilter ? r.status === statusFilter : r.status === "PENDING" || !statusFilter
    return nameMatch && (statusFilter ? r.status === statusFilter : true)
  }).filter(r => {
    if (!search && !statusFilter) return true
    const nameMatch = search ? `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase().includes(search.toLowerCase()) || (r.employee.employeeId?.toLowerCase().includes(search.toLowerCase())) : true
    const sMatch = statusFilter ? r.status === statusFilter : true
    return nameMatch && sMatch
  })

  const perPage = 20
  const start = (page - 1) * perPage
  const paginated = filtered.slice(start, start + perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  const th: React.CSSProperties = { padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  const pending = requests.filter(r => r.status === "PENDING").length
  const approved = requests.filter(r => r.status === "APPROVED").length
  const declined = requests.filter(r => r.status === "DECLINED").length
  const canApproveExitRequest = user?.can("canApproveExitRequest") ?? false
  const canDeleteExitRequest = user?.can("canDeleteExitRequest") ?? false

  const stats = [
    { label: "Total Requests", value: requests.length, bg: "#EFF6FF", color: "#1d4ed8", border: "#BFDBFE" },
    { label: "Pending Review", value: pending, bg: "#FEF3C7", color: "#92400e", border: "#FDE68A",
      onClick: () => { setStatusFilter("PENDING"); setPage(1) } },
    { label: "Approved", value: approved, bg: "#DCFCE7", color: "#15803d", border: "#BBF7D0",
      onClick: () => { setStatusFilter("APPROVED"); setPage(1) } },
    { label: "Declined", value: declined, bg: "#FEE2E2", color: "#DC2626", border: "#FECACA",
      onClick: () => { setStatusFilter("DECLINED"); setPage(1) } },
  ]

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Exit Requests</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Review and manage employee exit requests</p>
        </div>
        {canApproveExitRequest && (
          <button onClick={() => router.push("/admin/requests/exits/record")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>
            <Plus size={15} /> Record Exit
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} onClick={s.onClick}
            style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: "16px 20px", cursor: s.onClick ? "pointer" : "default", transition: "opacity .15s" }}
            onMouseEnter={e => { if (s.onClick) (e.currentTarget as HTMLElement).style.opacity = "0.8" }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{loading ? "—" : s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.color, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, maxWidth: 300 }}>
            <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search employees…"
              style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", width: "100%", color: "var(--foreground)" }} />
          </div>
          <div ref={filterRef} style={{ position: "relative" }}>
            <button onClick={() => setFilterOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              {STATUS_OPTS.find(o => o.value === statusFilter)?.label ?? "All"} <ChevronDown size={13} />
            </button>
            {filterOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 140, padding: "4px 0" }}>
                <button onClick={() => { setStatusFilter(""); setFilterOpen(false); setPage(1) }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: statusFilter === "" ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                  All {statusFilter === "" && <Check size={13} />}
                </button>
                {STATUS_OPTS.filter(o => o.value).map(o => (
                  <button key={o.value} onClick={() => { setStatusFilter(o.value); setFilterOpen(false); setPage(1) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: statusFilter === o.value ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                    {o.label} {statusFilter === o.value && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            {search || statusFilter ? "No exit requests match your filter." : "No exit requests yet."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Employee</th>
                  <th style={th}>Exit Type</th>
                  <th style={th}>Intended Last Day</th>
                  <th style={th}>Reason</th>
                  <th style={th}>Submitted</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(req => {
                  const s = STATUS_STYLE[req.status] ?? { bg: "#F3F4F6", color: "#6B7280", label: req.status }
                  return (
                    <tr key={req.id} style={{ transition: "background .1s", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                      onClick={() => setReviewReq(req)}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Av name={`${req.employee.firstName} ${req.employee.lastName}`} photo={req.employee.profilePhoto} />
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              <span style={{ fontWeight: 800 }}>{req.employee.lastName?.toUpperCase()}</span> {req.employee.firstName}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{req.employee.department?.name ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>{EXIT_LABEL[req.exitType] ?? req.exitType}</td>
                      <td style={td}>{new Date(req.intendedLastDay).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.reason ?? "—"}</td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {canApproveExitRequest && (
                          <button onClick={e => { e.stopPropagation(); setReviewReq(req) }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "var(--muted-foreground)" }}>
                            <MoreHorizontal size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--muted-foreground)" }}>
            <span>{start + 1}–{Math.min(start + perPage, filtered.length)} of {filtered.length} items</span>
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "4px 10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                  <button key={pg} onClick={() => setPage(pg)} style={{ padding: "4px 10px", background: page === pg ? "var(--primary)" : "var(--muted)", border: `1px solid ${page === pg ? "var(--primary)" : "var(--border)"}`, borderRadius: 6, cursor: "pointer", color: page === pg ? "white" : "var(--foreground)", fontWeight: page === pg ? 700 : 400 }}>{pg}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: "4px 10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>›</button>
              </div>
            )}
          </div>
        )}
      </div>

      {reviewReq && (
        <ReviewPanel req={reviewReq} onClose={() => setReviewReq(null)} onDone={() => { setReviewReq(null); load() }} />
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
