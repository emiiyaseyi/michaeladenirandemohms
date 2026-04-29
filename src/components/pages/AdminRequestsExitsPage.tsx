"use client"
import { useEffect, useState, useCallback } from "react"
import { LogOut, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"

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

function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#4338CA", flexShrink: 0 }}>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--background)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XCircle size={18} style={{ color: "#DC2626" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Decline Exit Request</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.5 }}>
          You are declining <strong>{req.employee.firstName} {req.employee.lastName}</strong>'s exit request.
          Please provide a reason — it will be sent to the employee.
        </p>
        <textarea
          placeholder="Reason for declining..."
          value={reason}
          onChange={e => { setReason(e.target.value); setErr("") }}
          rows={3}
          style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", padding: "10px 12px", fontSize: 13, resize: "vertical", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
        />
        {err && <p style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={loading} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 13, cursor: "pointer", color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
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

  const lastDay = new Date(req.intendedLastDay).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--background)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={18} style={{ color: "#059669" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Approve Exit Request</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 6, lineHeight: 1.6 }}>
          You are approving <strong>{req.employee.firstName} {req.employee.lastName}</strong>'s{" "}
          <strong>{EXIT_LABEL[req.exitType] ?? req.exitType}</strong> request.
        </p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.6 }}>
          Their intended last day is <strong>{lastDay}</strong>. An offboarding record and 5-task checklist will be automatically created.
        </p>
        {err && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "#FEE2E2", marginBottom: 12 }}>
            <AlertTriangle size={14} style={{ color: "#DC2626", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#DC2626" }}>{err}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={loading} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 13, cursor: "pointer", color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Approving…" : "Approve & Initiate Offboarding"}
          </button>
        </div>
      </div>
    </div>
  )
}

function RequestRow({ req, onRefresh }: { req: ExitRequest; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [approving, setApproving] = useState(false)
  const [declining, setDeclining] = useState(false)

  const sc = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING
  const lastDay = new Date(req.intendedLastDay).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const submitted = new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const fullName = `${req.employee.firstName} ${req.employee.lastName}`

  return (
    <>
      {approving && <ApproveModal req={req} onClose={() => setApproving(false)} onDone={() => { setApproving(false); onRefresh() }} />}
      {declining && <DeclineModal req={req} onClose={() => setDeclining(false)} onDone={() => { setDeclining(false); onRefresh() }} />}

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--background)" }}>
        {/* Main row */}
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Avatar src={req.employee.profilePhoto} name={fullName} size={40} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{fullName}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {req.employee.jobTitle ?? "—"}{req.employee.department ? ` · ${req.employee.department.name}` : ""}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{EXIT_LABEL[req.exitType] ?? req.exitType}</span>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Last day</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{lastDay}</div>
          </div>

          {req.status === "PENDING" && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setApproving(true)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              >
                <CheckCircle size={13} /> Approve
              </button>
              <button
                onClick={() => setDeclining(true)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #DC2626", background: "transparent", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              >
                <XCircle size={13} /> Decline
              </button>
            </div>
          )}

          <button
            onClick={() => setExpanded(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted-foreground)", flexShrink: 0 }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div style={{ borderTop: "1px solid var(--border)", padding: "14px 20px", background: "var(--muted)/0.3", display: "flex", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Employee ID</div>
              <div style={{ fontSize: 13 }}>{req.employee.employeeId}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Submitted</div>
              <div style={{ fontSize: 13 }}>{submitted}</div>
            </div>
            {req.reason && (
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Reason</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{req.reason}</div>
              </div>
            )}
            {req.status !== "PENDING" && req.reviewedBy && (
              <div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Reviewed By</div>
                <div style={{ fontSize: 13 }}>{req.reviewedBy.name}</div>
              </div>
            )}
            {req.status === "DECLINED" && req.declineReason && (
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Decline Reason</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{req.declineReason}</div>
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
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>("ALL")

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

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL",      label: `All (${requests.length})` },
    { key: "PENDING",  label: `Pending (${requests.filter(r => r.status === "PENDING").length})` },
    { key: "APPROVED", label: `Approved (${requests.filter(r => r.status === "APPROVED").length})` },
    { key: "DECLINED", label: `Declined (${requests.filter(r => r.status === "DECLINED").length})` },
  ]

  const filtered = tab === "ALL" ? requests : requests.filter(r => r.status === tab)

  const pendingCount = requests.filter(r => r.status === "PENDING").length

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Exit Requests</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
          Employee-submitted exit requests pending your action.
        </p>
      </div>

      {pendingCount > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 10, background: "#FEF3C7", border: "1px solid #FDE68A", marginBottom: 20 }}>
          <Clock size={15} style={{ color: "#D97706", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#92400E", fontWeight: 500 }}>
            {pendingCount} request{pendingCount > 1 ? "s" : ""} awaiting your review.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "var(--foreground)" : "var(--muted-foreground)",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--foreground)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <LogOut size={22} style={{ color: "#9CA3AF" }} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
            {tab === "ALL" ? "No exit requests yet" : `No ${tab.toLowerCase()} requests`}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            {tab === "ALL" ? "When employees submit exit requests, they will appear here." : "Nothing in this category right now."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(r => (
            <RequestRow key={r.id} req={r} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  )
}
