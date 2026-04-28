"use client"
import { useState, useEffect, useCallback } from "react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { FileCheck, Clock, CheckCircle, XCircle, ExternalLink, Eye } from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  SSCE: "SSCE Certificate",
  FIRST_DEGREE: "First Degree",
  NYSC: "NYSC Certificate",
  PROFESSIONAL_CERT: "Professional Certificate",
  UTILITY_BILL: "Utility Bill",
  OTHER: "Other Document",
}

const STATUS_META = {
  PENDING:  { bg: "#FFFBEB", color: "#B45309", icon: Clock,         label: "Pending"  },
  APPROVED: { bg: "#E6F4EA", color: "#1A7336", icon: CheckCircle,   label: "Approved" },
  REJECTED: { bg: "#FEE2E2", color: "#DC2626", icon: XCircle,       label: "Rejected" },
}

export default function PersonalDocsAdminPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")
  const [reviewing, setReviewing] = useState<any | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/personal-docs?status=${tab}`)
    const d = res.ok ? await res.json() : { docs: [] }
    setDocs(d.docs ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  async function review(action: "approve" | "reject") {
    if (!reviewing) return
    setSubmitting(true)
    await fetch(`/api/personal-docs/${reviewing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNote }),
    })
    setSubmitting(false)
    setReviewing(null)
    setReviewNote("")
    await load()
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Personal Documents</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Review and approve employee personal document submissions</p>
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
      ) : docs.length === 0 ? (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <FileCheck size={36} style={{ color: "var(--muted-foreground)", opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700 }}>No {tab.toLowerCase()} documents</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map(doc => {
            const meta = STATUS_META[doc.status as keyof typeof STATUS_META] ?? STATUS_META.PENDING
            const Icon = meta.icon
            return (
              <Card key={doc.id}>
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                  <Avatar name={`${doc.employee.firstName} ${doc.employee.lastName}`} photo={doc.employee.profilePhoto} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{doc.employee.firstName} {doc.employee.lastName}</span>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{doc.employee.employeeId}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: meta.bg, color: meta.color,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <Icon size={10} /> {meta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {doc.employee.jobTitle ?? "—"} · {doc.employee.department?.name ?? "—"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "var(--muted)", color: "var(--foreground)" }}>
                        {TYPE_LABELS[doc.type] ?? doc.type}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{doc.fileName}</span>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        Uploaded {new Date(doc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      {doc.reviewer && (
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>· Reviewed by {doc.reviewer.name}</span>
                      )}
                    </div>
                    {doc.reviewNote && (
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>Note: {doc.reviewNote}</div>
                    )}
                    {doc.notes && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted-foreground)" }}>Employee note: {doc.notes}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--primary)", textDecoration: "none", padding: "6px 12px", border: "1px solid var(--primary)", borderRadius: 6 }}>
                      <Eye size={13} /> View
                    </a>
                    {doc.status === "PENDING" && (
                      <Button onClick={() => { setReviewing(doc); setReviewNote("") }}>Review</Button>
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
        <Modal open onClose={() => setReviewing(null)} title="Review Document" width={520}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={`${reviewing.employee.firstName} ${reviewing.employee.lastName}`} photo={reviewing.employee.profilePhoto} size={40} />
              <div>
                <div style={{ fontWeight: 700 }}>{reviewing.employee.firstName} {reviewing.employee.lastName}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{reviewing.employee.jobTitle}</div>
              </div>
            </div>

            <div style={{ padding: "12px 16px", borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{TYPE_LABELS[reviewing.type] ?? reviewing.type}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{reviewing.fileName}</div>
                {reviewing.notes && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, fontStyle: "italic" }}>Note: {reviewing.notes}</div>}
              </div>
              <a href={reviewing.fileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--primary)", textDecoration: "none", padding: "6px 12px", border: "1px solid var(--primary)", borderRadius: 6 }}>
                <ExternalLink size={13} /> Open File
              </a>
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
