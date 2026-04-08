"use client"
import { useState, useEffect, useCallback } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import EmptyState from "@/components/ui/EmptyState"
import { CalendarDays, Plus, Check, X, MessageSquare, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/useCurrentUser"

export default function LeavePage() {
  const { user } = useCurrentUser()
  const [requests, setRequests] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"ALL"|"PENDING"|"APPROVED"|"REJECTED">("ALL")
  const [applyOpen, setApplyOpen] = useState(false)
  const [form, setForm] = useState({ employeeId: "", leaveTypeId: "", startDate: "", endDate: "", reason: "", handoverNotes: "" })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/leave?status=${tab === "ALL" ? "" : tab}`)
    const data = await r.json()
    setRequests(data.requests ?? [])
    setLeaveTypes(data.leaveTypes ?? [])
    setEmployees(data.employees ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    await fetch(`/api/leave/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "APPROVED" }) })
    load()
  }
  const reject = async (id: string) => {
    const reason = prompt("Rejection reason (required):")
    if (!reason) return
    await fetch(`/api/leave/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "REJECTED", comment: reason }) })
    load()
  }

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) { setApplyOpen(false); load() }
  }

  const tabs: Array<"ALL"|"PENDING"|"APPROVED"|"REJECTED"> = ["ALL","PENDING","APPROVED","REJECTED"]
  const counts: Record<string, number> = { ALL: requests.length }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Leave Management</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Review and manage staff leave requests</p>
        </div>
        {user?.caps.canSubmitLeave && (
          <Button size="sm" onClick={() => setApplyOpen(true)}><Plus size={14} /> Apply Leave</Button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--muted)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
        ) : requests.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No leave requests" description="No requests match the current filter." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Employee","Leave Type","Duration","Dates","Status","Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((req: any) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={`${req.employee?.firstName} ${req.employee?.lastName}`} photo={req.employee?.profilePhoto} size={34} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{req.employee?.firstName} {req.employee?.lastName}</div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{req.employee?.department?.name ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13 }}>{req.leaveType?.name}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600 }}>{req.days} day{req.days !== 1 ? "s" : ""}</td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--muted-foreground)" }}>{formatDate(req.startDate)} → {formatDate(req.endDate)}</td>
                    <td style={{ padding: "14px 20px" }}><Badge status={req.status} /></td>
                    <td style={{ padding: "14px 20px" }}>
                      {req.status === "PENDING" && user?.caps.canApproveLeave && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => approve(req.id)} style={{ background: "var(--success-bg)", color: "var(--success)", border: "none", cursor: "pointer", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Check size={12} /> Approve</button>
                          <button onClick={() => reject(req.id)} style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "none", cursor: "pointer", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><X size={12} /> Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Apply Leave Modal */}
      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Leave" width={560}>
        <form onSubmit={submitLeave}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Employee <span style={{ color: "var(--accent)" }}>*</span></label>
              <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} required style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
                <option value="">Select employee...</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Leave Type <span style={{ color: "var(--accent)" }}>*</span></label>
              <select value={form.leaveTypeId} onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))} required style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
                <option value="">Select type...</option>
                {leaveTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.defaultDays} days)</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Start Date <span style={{ color: "var(--accent)" }}>*</span></label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>End Date <span style={{ color: "var(--accent)" }}>*</span></label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Reason <span style={{ color: "var(--accent)" }}>*</span></label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required rows={3} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Handover Notes</label>
              <textarea value={form.handoverNotes} onChange={e => setForm(f => ({ ...f, handoverNotes: e.target.value }))} rows={2} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
            </div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
