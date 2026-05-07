"use client"
import { useState, useEffect, useRef } from "react"
import { Search, MoreHorizontal, Loader2, Plus, ChevronDown, X, Check } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const STATUS_OPTS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: "#FEF3C7", color: "#D97706" },
  APPROVED: { bg: "#D1FAE5", color: "#059669" },
  DECLINED: { bg: "#FEE2E2", color: "#DC2626" },
}

function Av({ name, photo }: { name: string; photo?: string | null }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  if (photo) return <img src={photo} alt={name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  return <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0 }}>{initials}</div>
}

function ReviewPanel({ req, onClose, onDone }: { req: any; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const act = async (action: "APPROVE" | "DECLINE") => {
    setSaving(true); setErr("")
    const r = await fetch(`/api/requests/redeployments/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, declineReason: action === "DECLINE" ? note : undefined }),
    })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    onDone()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div className="side-panel" style={{ background: "var(--card)", width: 520, height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>Redeployment — {req.employee.firstName} {req.employee.lastName}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {[
            ["From Department", req.fromDepartment?.name ?? "—"],
            ["To Department", req.toDepartment?.name ?? "—"],
            ["From Job Title", req.fromJobTitle ?? "—"],
            ["To Job Title", req.toJobTitle ?? "—"],
            ["Effective Date", req.effectiveDate ? new Date(req.effectiveDate).toLocaleDateString("en-NG") : "—"],
            ["Reason", req.reason ?? "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 13 }}>{v}</div>
            </div>
          ))}
          {req.noteForUser && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 2 }}>Note for employee</div>
              <div style={{ fontSize: 13 }}>{req.noteForUser}</div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Note <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400 }}>(required when declining)</span></label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Provide reason if declining"
            rows={3} style={{ width: "100%", padding: "9px 13px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>

        {err && <div style={{ marginBottom: 12, fontSize: 12, color: "#ef4444" }}>{err}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => act("DECLINE")} disabled={saving} style={{ flex: 1, padding: "10px 0", background: "none", border: "1px solid #ef4444", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
            Decline
          </button>
          <button onClick={() => act("APPROVE")} disabled={saving} style={{ flex: 1, padding: "10px 0", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {saving ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : null} Approve
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function RecordModal({ employees, departments, onClose, onSaved }: { employees: any[]; departments: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ employeeId: "", fromDepartmentId: "", toDepartmentId: "", fromJobTitle: "", toJobTitle: "", effectiveDate: "", reason: "", noteForUser: "" })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const fi: React.CSSProperties = { width: "100%", padding: "9px 13px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" as any }

  const save = async () => {
    if (!form.employeeId) { setErr("Employee is required"); return }
    if (!form.toDepartmentId && !form.toJobTitle) { setErr("New department or new job title is required"); return }
    setSaving(true); setErr("")
    const r = await fetch("/api/requests/redeployments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setErr(d.error ?? "Failed to save"); return }
    onSaved()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60, overflowY: "auto" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 860, margin: "0 16px 60px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Record Redeployment</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Record a redeployment for an employee — moving them to a new department or role.</p>
        </div>
        <div style={{ padding: 28 }}>
          <div className="grid-2col" style={{ gap: 20 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Employee <span style={{ color: "#ef4444" }}>*</span></label>
              <select value={form.employeeId} onChange={set("employeeId")} style={{ ...fi, appearance: "none" as any, cursor: "pointer" }}>
                <option value="">Please Select</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeId})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Current Department</label>
              <select value={form.fromDepartmentId} onChange={set("fromDepartmentId")} style={{ ...fi, appearance: "none" as any, cursor: "pointer" }}>
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>New Department</label>
              <select value={form.toDepartmentId} onChange={set("toDepartmentId")} style={{ ...fi, appearance: "none" as any, cursor: "pointer" }}>
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Current Job Title</label>
              <input type="text" value={form.fromJobTitle} onChange={set("fromJobTitle")} placeholder="e.g. Software Engineer" style={fi} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>New Job Title</label>
              <input type="text" value={form.toJobTitle} onChange={set("toJobTitle")} placeholder="e.g. Senior Software Engineer" style={fi} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Effective Date</label>
              <input type="date" value={form.effectiveDate} onChange={set("effectiveDate")} style={fi} />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Reason</label>
            <textarea value={form.reason} onChange={set("reason")} placeholder="Optional" rows={3}
              style={{ ...fi, resize: "vertical" }} />
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Add note for employee</label>
            <textarea value={form.noteForUser} onChange={set("noteForUser")} placeholder="Optional" rows={2}
              style={{ ...fi, resize: "vertical" }} />
          </div>
          {err && <div style={{ marginTop: 12, fontSize: 12, color: "#ef4444" }}>{err}</div>}
        </div>
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 7 }}>
            {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Submit"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function RedeploymentsPage() {
  const { user } = useCurrentUser()
  const [requests, setRequests] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [reviewReq, setReviewReq] = useState<any>(null)
  const [recordOpen, setRecordOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, declined: 0 })

  const loadSummary = async () => {
    const [rAll, rPend, rApp, rDec] = await Promise.all([
      fetch("/api/requests/redeployments?page=1"),
      fetch("/api/requests/redeployments?status=PENDING&page=1"),
      fetch("/api/requests/redeployments?status=APPROVED&page=1"),
      fetch("/api/requests/redeployments?status=DECLINED&page=1"),
    ])
    const [dAll, dPend, dApp, dDec] = await Promise.all([rAll.json(), rPend.json(), rApp.json(), rDec.json()])
    setSummary({ total: dAll.total ?? 0, pending: dPend.total ?? 0, approved: dApp.total ?? 0, declined: dDec.total ?? 0 })
  }

  useEffect(() => {
    if (!filterOpen) return
    const h = (e: MouseEvent) => { if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [filterOpen])

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (search) params.set("search", search)
    params.set("page", String(page))
    const [r1, r2] = await Promise.all([
      fetch(`/api/requests/redeployments?${params}`),
      fetch("/api/employees?status=ACTIVE"),
    ])
    const [d1, d2] = await Promise.all([r1.json(), r2.json()])
    setRequests(d1.requests ?? [])
    setTotal(d1.total ?? 0)
    setEmployees(d2.employees ?? [])
    setDepartments(d2.departments ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter, search, page])
  useEffect(() => { loadSummary() }, [])

  const th: React.CSSProperties = { padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  const filterLabel = STATUS_OPTS.find(o => o.value === statusFilter)?.label ?? "All"
  const perPage = 20
  const totalPages = Math.ceil(total / perPage)

  const statsCards = [
    { label: "Total Requests", value: summary.total, bg: "#EFF6FF", color: "#1d4ed8", border: "#BFDBFE", filter: null },
    { label: "Pending Review", value: summary.pending, bg: "#FEF3C7", color: "#92400e", border: "#FDE68A", filter: "PENDING" },
    { label: "Approved", value: summary.approved, bg: "#DCFCE7", color: "#15803d", border: "#BBF7D0", filter: "APPROVED" },
    { label: "Declined", value: summary.declined, bg: "#FEE2E2", color: "#DC2626", border: "#FECACA", filter: "DECLINED" },
  ]

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Redeployments</h1>
        <button onClick={() => setRecordOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
          <Plus size={14} /> Record Redeployment
        </button>
      </div>

      <div className="grid-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {statsCards.map(card => (
          <div key={card.label} onClick={() => { if (card.filter !== null) { setStatusFilter(card.filter); setPage(1) } }}
            style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 12, padding: "18px 20px", cursor: card.filter !== null ? "pointer" : "default" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: card.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, maxWidth: 260 }}>
            <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search…"
              style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", width: "100%", color: "var(--foreground)" }} />
          </div>
          <div ref={filterRef} style={{ position: "relative" }}>
            <button onClick={() => setFilterOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              {filterLabel} <ChevronDown size={13} />
            </button>
            {filterOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 130, padding: "4px 0" }}>
                {STATUS_OPTS.map(o => (
                  <button key={o.value} onClick={() => { setStatusFilter(o.value); setPage(1); setFilterOpen(false) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: statusFilter === o.value ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
                    {o.label} {statusFilter === o.value && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No redeployment requests found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Employee</th>
                  <th style={th}>From</th>
                  <th style={th}>To</th>
                  <th style={th}>Effective Date</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => {
                  const s = STATUS_STYLE[r.status] ?? { bg: "#F3F4F6", color: "#6B7280" }
                  return (
                    <tr key={r.id} style={{ transition: "background .1s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Av name={`${r.employee.firstName} ${r.employee.lastName}`} photo={r.employee.profilePhoto} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{r.employee.firstName} {r.employee.lastName}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.employee.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: 13 }}>{r.fromDepartment?.name ?? "—"}</div>
                        {r.fromJobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.fromJobTitle}</div>}
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: 13 }}>{r.toDepartment?.name ?? "—"}</div>
                        {r.toJobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.toJobTitle}</div>}
                      </td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>
                        {r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString("en-NG") : "—"}
                      </td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color }}>{r.status}</span></td>
                      <td style={td}>
                        <button onClick={() => setReviewReq(r)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "var(--muted-foreground)" }}>
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding: "12px 20px", borderTop: requests.length > 0 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--muted-foreground)" }}>
          <span>{total} item{total !== 1 ? "s" : ""}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "4px 8px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>‹</button>
            <span style={{ fontWeight: 700 }}>{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: "4px 8px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>›</button>
          </div>
        </div>
      </div>

      {reviewReq && <ReviewPanel req={reviewReq} onClose={() => setReviewReq(null)} onDone={() => { setReviewReq(null); load() }} />}
      {recordOpen && <RecordModal employees={employees} departments={departments} onClose={() => setRecordOpen(false)} onSaved={() => { setRecordOpen(false); load() }} />}
    </div>
  )
}
