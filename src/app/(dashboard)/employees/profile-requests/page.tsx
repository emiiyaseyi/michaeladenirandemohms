"use client"
import { useState, useEffect, useCallback } from "react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { UserCheck, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown } from "lucide-react"

const FIELD_LABELS: Record<string, string> = {
  phone: "Phone", alternatePhone: "Alt. Phone", personalEmail: "Personal Email",
  address: "Address", city: "City", state: "State", country: "Country", postalCode: "Postal Code",
  gender: "Gender", dateOfBirth: "Date of Birth", maritalStatus: "Marital Status",
  nationality: "Nationality", stateOfOrigin: "State of Origin",
  nokName: "NOK Name", nokPhone: "NOK Phone", nokRelationship: "NOK Relationship", nokAddress: "NOK Address",
  bankName: "Bank Name", bankAccountNo: "Account No.", bankAccountName: "Account Name",
}

const STATUS_META = {
  PENDING: { bg: "#FFFBEB", color: "#B45309", icon: Clock, label: "Pending" },
  APPROVED: { bg: "var(--success-bg,#E6F4EA)", color: "var(--success,#1A7336)", icon: CheckCircle, label: "Approved" },
  REJECTED: { bg: "var(--danger-bg,#FEE2E2)", color: "#DC2626", icon: XCircle, label: "Rejected" },
}

export default function ProfileRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")
  const [reviewing, setReviewing] = useState<any | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/profile-requests?status=${tab}`)
    const d = res.ok ? await res.json() : { requests: [] }
    setRequests(d.requests ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  async function review(action: "approve" | "reject") {
    if (!reviewing) return
    setSubmitting(true)
    await fetch(`/api/profile-requests/${reviewing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNote }),
    })
    setSubmitting(false)
    setReviewing(null)
    setReviewNote("")
    await load()
  }

  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 }
  requests.forEach(r => { if (r.status in counts) counts[r.status as keyof typeof counts]++ })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Profile Update Requests</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Review and approve employee profile update requests</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
        {(["PENDING", "APPROVED", "REJECTED"] as const).map(t => {
          const m = STATUS_META[t]
          const Icon = m.icon
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: "8px 18px", fontSize: 12, fontWeight: tab === t ? 700 : 400,
                border: "1px solid", borderRadius: 6, cursor: "pointer",
                background: tab === t ? "var(--primary)" : "transparent",
                borderColor: tab === t ? "var(--primary)" : "var(--border)",
                color: tab === t ? "white" : "var(--muted-foreground)",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Icon size={13} /> {m.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <Card style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</Card>
      ) : requests.length === 0 ? (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <UserCheck size={36} style={{ color: "var(--muted-foreground)", opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700 }}>No {tab.toLowerCase()} requests</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {requests.map(req => {
            const meta = STATUS_META[req.status as keyof typeof STATUS_META] ?? STATUS_META.PENDING
            const Icon = meta.icon
            const changes = req.changes as Record<string, any>
            const changedKeys = Object.keys(changes).filter(k => changes[k] !== null && changes[k] !== undefined)

            return (
              <Card key={req.id}>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <Avatar name={`${req.employee.firstName} ${req.employee.lastName}`} photo={req.employee.profilePhoto} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{req.employee.firstName} {req.employee.lastName}</span>
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{req.employee.employeeId}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: meta.bg, color: meta.color, display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon size={10} /> {meta.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                        {req.employee.jobTitle ?? "—"} · {req.employee.department?.name ?? "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                        Submitted {new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {req.reviewer && <> · Reviewed by {req.reviewer.name}</>}
                      </div>

                      {/* Changes summary */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {changedKeys.map(k => (
                          <div key={k} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "var(--muted)", color: "var(--foreground)" }}>
                            <span style={{ fontWeight: 700 }}>{FIELD_LABELS[k] ?? k}:</span>{" "}
                            <span>{changes[k] ?? "—"}</span>
                          </div>
                        ))}
                      </div>

                      {req.reviewNote && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                          Note: {req.reviewNote}
                        </div>
                      )}
                    </div>

                    {req.status === "PENDING" && (
                      <Button onClick={() => { setReviewing(req); setReviewNote("") }} style={{ flexShrink: 0 }}>
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Review modal */}
      {reviewing && (
        <Modal open onClose={() => setReviewing(null)} title="Review Profile Update" width={560}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={`${reviewing.employee.firstName} ${reviewing.employee.lastName}`} photo={reviewing.employee.profilePhoto} size={40} />
              <div>
                <div style={{ fontWeight: 700 }}>{reviewing.employee.firstName} {reviewing.employee.lastName}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{reviewing.employee.jobTitle}</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 8 }}>Requested Changes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {Object.entries(reviewing.changes as Record<string, any>).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 10, padding: "6px 10px", borderRadius: 6, background: "var(--muted)", fontSize: 13 }}>
                    <span style={{ fontWeight: 600, minWidth: 120, color: "var(--muted-foreground)" }}>{FIELD_LABELS[k] ?? k}</span>
                    <span>{v ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--muted-foreground)" }}>Review Note (optional)</label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={2}
                placeholder="Add a note visible to the employee…"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, resize: "vertical", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" onClick={() => setReviewing(null)}>Cancel</Button>
              <Button onClick={() => review("reject")} disabled={submitting} style={{ background: "#EF4444", borderColor: "#EF4444" }}>
                <XCircle size={13} /> Reject
              </Button>
              <Button onClick={() => review("approve")} disabled={submitting}>
                <CheckCircle size={13} /> Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
