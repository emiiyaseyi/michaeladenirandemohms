"use client"
import { useEffect, useState, useCallback } from "react"
import { LogOut, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, AlertTriangle, Users, TrendingDown } from "lucide-react"

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: "Pending",  color: "#D97706", bg: "#FEF3C7" },
  APPROVED: { label: "Approved", color: "#059669", bg: "#D1FAE5" },
  DECLINED: { label: "Declined", color: "#DC2626", bg: "#FEE2E2" },
}

function Avatar({ src, name, size = 44 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 800, color: "#4338CA", flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function DeclineModal({ req, onClose, onDone }: { req: ExitRequest; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  async function submit() {
    if (!reason.trim()) { setErr("Please provide a reason for declining."); return }
    setLoading(true)
    const res = await fetch(`/api/requests/exits/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DECLINE", declineReason: reason }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Failed"); return }
    onDone()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card)", borderRadius: 18, padding: "28px 32px", width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XCircle size={20} style={{ color: "#DC2626" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Decline Exit Request</span>
        </div>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 18, lineHeight: 1.6 }}>
          You are declining <strong style={{ color: "var(--foreground)" }}>{req.employee.firstName} {req.employee.lastName}</strong>'s exit request.
          Please provide a reason — it will be shared with the employee.
        </p>
        <textarea
          placeholder="Reason for declining…"
          value={reason}
          onChange={e => { setReason(e.target.value); setErr("") }}
          rows={4}
          style={{ width: "100%", borderRadius: 10, border: "1.5px solid var(--border)", padding: "12px 14px", fontSize: 14, resize: "vertical", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box", lineHeight: 1.6 }}
        />
        {err && <p style={{ color: "#DC2626", fontSize: 13, marginTop: 6 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={loading} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading} style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Declining…" : "Decline Request"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApproveModal({ req, onClose, onDone }: { req: ExitRequest; onClose: () => void; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  async function submit() {
    setLoading(true)
    const res = await fetch(`/api/requests/exits/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE" }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Failed"); return }
    onDone()
  }

  const lastDay = new Date(req.intendedLastDay).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card)", borderRadius: 18, padding: "28px 32px", width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={20} style={{ color: "#059669" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Approve Exit Request</span>
        </div>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 8, lineHeight: 1.6 }}>
          You are approving <strong style={{ color: "var(--foreground)" }}>{req.employee.firstName} {req.employee.lastName}</strong>'s{" "}
          <strong style={{ color: "var(--foreground)" }}>{EXIT_LABEL[req.exitType] ?? req.exitType}</strong> request.
        </p>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 18, lineHeight: 1.6 }}>
          Their intended last day is <strong style={{ color: "var(--foreground)" }}>{lastDay}</strong>. An offboarding record and checklist will be automatically created.
        </p>
        {err && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "11px 14px", borderRadius: 9, background: "#FEE2E2", marginBottom: 16 }}>
            <AlertTriangle size={14} style={{ color: "#DC2626", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#DC2626" }}>{err}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={loading} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading} style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Approving…" : "Approve & Start Offboarding"}
          </button>
        </div>
      </div>
    </div>
  )
}

function RequestCard({ req, onRefresh }: { req: ExitRequest; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [approving, setApproving] = useState(false)
  const [declining, setDeclining] = useState(false)

  const sc       = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING
  const lastDay  = new Date(req.intendedLastDay).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const submitted = new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const fullName = `${req.employee.firstName} ${req.employee.lastName}`

  return (
    <>
      {approving && <ApproveModal req={req} onClose={() => setApproving(false)} onDone={() => { setApproving(false); onRefresh() }} />}
      {declining && <DeclineModal req={req} onClose={() => setDeclining(false)} onDone={() => { setDeclining(false); onRefresh() }} />}

      <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--card)", transition: "box-shadow .15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "none"}
      >
        {/* Main row */}
        <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <Avatar src={req.employee.profilePhoto} name={fullName} size={48} />

          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3 }}>{fullName}</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              {req.employee.jobTitle ?? "—"}
              {req.employee.department ? <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span> : ""}
              {req.employee.department?.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3 }}>ID: {req.employee.employeeId}</div>
          </div>

          {/* Exit type + status badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)" }}>
              {EXIT_LABEL[req.exitType] ?? req.exitType}
            </span>
          </div>

          {/* Last day */}
          <div style={{ textAlign: "center", flexShrink: 0, padding: "8px 16px", background: "var(--muted)", borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 3 }}>Last Day</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>{lastDay}</div>
          </div>

          {/* Actions */}
          {req.status === "PENDING" && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setApproving(true)}
                style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#047857"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#059669"}
              >
                <CheckCircle size={14} /> Approve
              </button>
              <button
                onClick={() => setDeclining(true)}
                style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #DC2626", background: "transparent", color: "#DC2626", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "#FEE2E2" }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent" }}
              >
                <XCircle size={14} /> Decline
              </button>
            </div>
          )}

          <button
            onClick={() => setExpanded(v => !v)}
            style={{ background: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer", padding: "8px 10px", color: "var(--muted-foreground)", flexShrink: 0, borderRadius: 8, display: "flex", alignItems: "center" }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div style={{ borderTop: "1px solid var(--border)", padding: "18px 24px", background: "var(--muted)", display: "flex", flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Submitted On</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{submitted}</div>
            </div>
            {req.reason && (
              <div style={{ flex: "1 1 240px" }}>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Reason</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--foreground)" }}>{req.reason}</div>
              </div>
            )}
            {req.status !== "PENDING" && req.reviewedBy && (
              <div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Reviewed By</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{req.reviewedBy.name}</div>
              </div>
            )}
            {req.status === "DECLINED" && req.declineReason && (
              <div style={{ flex: "1 1 240px" }}>
                <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Decline Reason</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "#DC2626" }}>{req.declineReason}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

type FilterTab = "ALL" | "PENDING" | "APPROVED" | "DECLINED"

export default function AdminRequestsExitsPage() {
  const [requests, setRequests] = useState<ExitRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<FilterTab>("ALL")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/requests/exits")
    if (res.ok) {
      const d = await res.json()
      setRequests(d.requests ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pending  = requests.filter(r => r.status === "PENDING").length
  const approved = requests.filter(r => r.status === "APPROVED").length
  const declined = requests.filter(r => r.status === "DECLINED").length

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL",      label: `All (${requests.length})` },
    { key: "PENDING",  label: `Pending (${pending})` },
    { key: "APPROVED", label: `Approved (${approved})` },
    { key: "DECLINED", label: `Declined (${declined})` },
  ]

  const filtered = tab === "ALL" ? requests : requests.filter(r => r.status === tab)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 5 }}>Exit Requests</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
          Employee-submitted exit requests pending your action.
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 14 }}>
        {[
          { label: "Total",    value: requests.length, icon: Users,        color: "#6366F1", bg: "#EEF2FF" },
          { label: "Pending",  value: pending,          icon: Clock,        color: "#D97706", bg: "#FEF3C7" },
          { label: "Approved", value: approved,         icon: CheckCircle,  color: "#059669", bg: "#D1FAE5" },
          { label: "Declined", value: declined,         icon: XCircle,      color: "#DC2626", bg: "#FEE2E2" },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "var(--foreground)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pending alert */}
      {pending > 0 && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 18px", borderRadius: 12, background: "#FEF3C7", border: "1px solid #FDE68A" }}>
          <Clock size={18} style={{ color: "#D97706", flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: "#92400E", fontWeight: 600 }}>
            {pending} request{pending > 1 ? "s" : ""} awaiting your review. Please action them promptly.
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px", fontSize: 14,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "var(--primary)" : "var(--muted-foreground)",
              background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === t.key ? "var(--primary)" : "transparent"}`,
              cursor: "pointer", marginBottom: -2, transition: "all .15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <TrendingDown size={28} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            {tab === "ALL" ? "No exit requests yet" : `No ${tab.toLowerCase()} requests`}
          </div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", maxWidth: 340, margin: "0 auto", lineHeight: 1.6 }}>
            {tab === "ALL" ? "When employees submit exit requests, they will appear here." : "Nothing in this category right now."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(r => (
            <RequestCard key={r.id} req={r} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  )
}
