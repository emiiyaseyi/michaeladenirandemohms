"use client"
import { useState } from "react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import { Check, X } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface LeaveRequest {
  id: string
  days: number
  startDate: Date | string
  endDate: Date | string
  reason?: string | null
  employee: { firstName: string; lastName: string; profilePhoto?: string | null }
  leaveType: { name: string }
}

interface Props {
  leaveRequests: LeaveRequest[]
  viewAllHref?: string
}

export default function PendingLeavePanel({ leaveRequests: initial, viewAllHref = "/admin/requests/leave" }: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState(initial)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const target = requests.find(r => r.id === approvingId || r.id === rejectingId)

  const act = async (id: string, action: "APPROVED" | "REJECTED") => {
    setLoading(true)
    setError("")
    const r = await fetch(`/api/leave/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    })
    setLoading(false)
    if (!r.ok) {
      const d = await r.json()
      setError(d.error ?? "Failed to process request")
      return
    }
    setRequests(prev => prev.filter(req => req.id !== id))
    setApprovingId(null)
    setRejectingId(null)
    setComment("")
    router.refresh()
  }

  const closeModals = () => {
    setApprovingId(null)
    setRejectingId(null)
    setComment("")
    setError("")
  }

  return (
    <>
      <Card>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Pending Leave Requests</h3>
          <a href={viewAllHref} style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>View all →</a>
        </div>
        {requests.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No pending requests</div>
        ) : (
          <div>
            {requests.map(req => (
              <div
                key={req.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border-light, #f5f7fa)", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
              >
                <Avatar name={`${req.employee.firstName} ${req.employee.lastName}`} photo={req.employee.profilePhoto ?? undefined} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {req.employee.firstName} {req.employee.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {req.leaveType.name} · {req.days} day{req.days !== 1 ? "s" : ""} · {formatDate(req.startDate)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => { setApprovingId(req.id); setRejectingId(null); setComment(""); setError("") }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: "#DCFCE7", border: "1px solid #86EFAC", color: "#16A34A", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={() => { setRejectingId(req.id); setApprovingId(null); setComment(""); setError("") }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#DC2626", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Approve Modal */}
      <Modal open={!!approvingId} onClose={closeModals} title="Approve Leave Request" width={480}>
        {target && (
          <div style={{ padding: 24 }}>
            <p style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              Approve <strong>{target.employee.firstName} {target.employee.lastName}</strong>'s{" "}
              {target.leaveType.name} leave — {target.days} day{target.days !== 1 ? "s" : ""},{" "}
              {formatDate(target.startDate)} – {formatDate(target.endDate)}?
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }}>Comment (optional)</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Add a note..."
                style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" onClick={closeModals}>Cancel</Button>
              <Button
                loading={loading}
                onClick={() => act(approvingId!, "APPROVED")}
                style={{ background: "#16A34A", borderColor: "#16A34A", color: "white" }}
              >
                <Check size={13} /> Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectingId} onClose={closeModals} title="Reject Leave Request" width={480}>
        {target && (
          <div style={{ padding: 24 }}>
            <p style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              Reject <strong>{target.employee.firstName} {target.employee.lastName}</strong>'s{" "}
              {target.leaveType.name} leave — {target.days} day{target.days !== 1 ? "s" : ""},{" "}
              {formatDate(target.startDate)} – {formatDate(target.endDate)}?
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }}>Reason for rejection</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Explain why this leave is being rejected..."
                style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" onClick={closeModals}>Cancel</Button>
              <Button
                variant="danger"
                loading={loading}
                onClick={() => act(rejectingId!, "REJECTED")}
              >
                <X size={13} /> Reject
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
