"use client"
import { useState, useEffect, useCallback } from "react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { UserCheck, Clock, CheckCircle, XCircle, KeyRound, Eye, EyeOff } from "lucide-react"

// ─── Profile update types ─────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  phone: "Phone", alternatePhone: "Alt. Phone", personalEmail: "Personal Email",
  address: "Address", city: "City", state: "State", country: "Country", postalCode: "Postal Code",
  gender: "Gender", dateOfBirth: "Date of Birth", maritalStatus: "Marital Status",
  nationality: "Nationality", stateOfOrigin: "State of Origin",
  nokName: "NOK Name", nokPhone: "NOK Phone", nokRelationship: "NOK Relationship", nokAddress: "NOK Address",
  bankName: "Bank Name", bankAccountNo: "Account No.", bankAccountName: "Account Name",
}

const STATUS_META = {
  PENDING:  { bg: "#FFFBEB", color: "#B45309", icon: Clock,         label: "Pending"  },
  APPROVED: { bg: "var(--success-bg,#E6F4EA)", color: "var(--success,#1A7336)", icon: CheckCircle, label: "Approved" },
  REJECTED: { bg: "var(--danger-bg,#FEE2E2)", color: "#DC2626",      icon: XCircle,     label: "Rejected" },
}

const RESET_STATUS_META = {
  PENDING:  { bg: "#FFFBEB", color: "#B45309",  label: "Pending"  },
  RESOLVED: { bg: "var(--success-bg,#E6F4EA)", color: "var(--success,#1A7336)", label: "Resolved" },
}

const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", TEAM_LEAD: "Team Lead", STAFF: "Staff" }

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileRequestsPage() {
  const [section, setSection] = useState<"profile" | "password">("profile")

  // ── Profile update state ──
  const [requests, setRequests] = useState<any[]>([])
  const [loadingP, setLoadingP] = useState(true)
  const [tab, setTab]           = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")
  const [reviewing, setReviewing] = useState<any | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [submittingP, setSubmittingP] = useState(false)

  // ── Password reset state ──
  const [resets, setResets]     = useState<any[]>([])
  const [loadingR, setLoadingR] = useState(true)
  const [resolving, setResolving] = useState<any | null>(null)
  const [tempPw, setTempPw]     = useState("")
  const [showTempPw, setShowTempPw] = useState(false)
  const [submittingR, setSubmittingR] = useState(false)
  const [resetError, setResetError] = useState("")

  const loadProfile = useCallback(async () => {
    setLoadingP(true)
    const res = await fetch(`/api/profile-requests?status=${tab}`)
    const d = res.ok ? await res.json() : { requests: [] }
    setRequests(d.requests ?? [])
    setLoadingP(false)
  }, [tab])

  const loadResets = useCallback(async () => {
    setLoadingR(true)
    const res = await fetch("/api/auth/forgot-password")
    const d = res.ok ? await res.json() : { requests: [] }
    setResets(d.requests ?? [])
    setLoadingR(false)
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])
  useEffect(() => { if (section === "password") loadResets() }, [section, loadResets])

  async function reviewProfile(action: "approve" | "reject") {
    if (!reviewing) return
    setSubmittingP(true)
    await fetch(`/api/profile-requests/${reviewing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNote }),
    })
    setSubmittingP(false)
    setReviewing(null)
    setReviewNote("")
    await loadProfile()
  }

  async function resolveReset() {
    if (!resolving) return
    setResetError("")
    if (!tempPw || tempPw.length < 8) { setResetError("Password must be at least 8 characters."); return }
    setSubmittingR(true)
    const res = await fetch(`/api/auth/forgot-password/${resolving.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: tempPw }),
    })
    const data = await res.json()
    setSubmittingR(false)
    if (!res.ok) { setResetError(data.error || "Something went wrong."); return }
    setResolving(null)
    setTempPw("")
    setResetError("")
    await loadResets()
  }

  const pendingResets = resets.filter(r => r.status === "PENDING").length

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>People Requests</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
          Review profile update requests and reset employee passwords
        </p>
      </div>

      {/* Section switcher */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
        {([
          { key: "profile",  label: "Profile Updates",  badge: 0 },
          { key: "password", label: "Password Resets",  badge: pendingResets },
        ] as const).map(({ key, label, badge }) => (
          <button key={key} onClick={() => setSection(key)}
            style={{ padding: "8px 18px", fontSize: 12, fontWeight: section === key ? 700 : 400, border: "1px solid", borderRadius: 6, cursor: "pointer", background: section === key ? "var(--primary)" : "transparent", borderColor: section === key ? "var(--primary)" : "var(--border)", color: section === key ? "white" : "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}
          >
            {label}
            {(badge ?? 0) > 0 && (
              <span style={{ background: section === key ? "rgba(255,255,255,0.25)" : "#EF4444", color: "white", fontSize: 10, fontWeight: 800, borderRadius: 10, padding: "1px 6px", lineHeight: 1.6 }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Profile Updates ── */}
      {section === "profile" && (
        <>
          <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
            {(["PENDING", "APPROVED", "REJECTED"] as const).map(t => {
              const m = STATUS_META[t]
              const Icon = m.icon
              return (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: "8px 18px", fontSize: 12, fontWeight: tab === t ? 700 : 400, border: "1px solid", borderRadius: 6, cursor: "pointer", background: tab === t ? "var(--foreground)" : "transparent", borderColor: tab === t ? "var(--foreground)" : "var(--border)", color: tab === t ? "var(--background)" : "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Icon size={13} /> {m.label}
                </button>
              )
            })}
          </div>

          {loadingP ? (
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
                  <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder="Add a note visible to the employee…"
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, resize: "vertical", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button variant="secondary" onClick={() => setReviewing(null)}>Cancel</Button>
                  <Button onClick={() => reviewProfile("reject")} disabled={submittingP} style={{ background: "#EF4444", borderColor: "#EF4444" }}>
                    <XCircle size={13} /> Reject
                  </Button>
                  <Button onClick={() => reviewProfile("approve")} disabled={submittingP}>
                    <CheckCircle size={13} /> Approve
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}

      {/* ── Password Resets ── */}
      {section === "password" && (
        <>
          {loadingR ? (
            <Card style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</Card>
          ) : resets.length === 0 ? (
            <Card style={{ padding: "48px 24px", textAlign: "center" }}>
              <KeyRound size={36} style={{ color: "var(--muted-foreground)", opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700 }}>No password reset requests</div>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {resets.map(r => {
                const meta = RESET_STATUS_META[r.status as keyof typeof RESET_STATUS_META] ?? RESET_STATUS_META.PENDING
                return (
                  <Card key={r.id}>
                    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <KeyRound size={20} style={{ color: "var(--muted-foreground)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{r.user?.name ?? r.email}</span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 700, background: meta.bg, color: meta.color }}>{meta.label}</span>
                          {r.user?.role && (
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{ROLE_LABELS[r.user.role] ?? r.user.role}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{r.email}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                          Requested {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {r.resolver && <> · Resolved by {r.resolver.name}</>}
                        </div>
                      </div>
                      {r.status === "PENDING" && (
                        <Button onClick={() => { setResolving(r); setTempPw(""); setResetError("") }} style={{ flexShrink: 0 }}>
                          Reset Password
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {resolving && (
            <Modal open onClose={() => setResolving(null)} title="Reset Employee Password" width={480}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{resolving.user?.name ?? resolving.email}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{resolving.email}</div>
                </div>

                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                  Set a temporary password for this employee. They will be required to change it on next sign-in. Make sure to send them the new password via WhatsApp or email.
                </p>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 7 }}>Temporary Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showTempPw ? "text" : "password"}
                      value={tempPw} onChange={e => setTempPw(e.target.value)}
                      placeholder="Min. 8 characters"
                      style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)", boxSizing: "border-box" }}
                    />
                    <button type="button" onClick={() => setShowTempPw(v => !v)} tabIndex={-1}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
                      {showTempPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {resetError && (
                  <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 14px", borderRadius: 8, fontSize: 13, border: "1px solid var(--danger)" }}>
                    ⚠ {resetError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button variant="secondary" onClick={() => setResolving(null)}>Cancel</Button>
                  <Button onClick={resolveReset} disabled={submittingR}>
                    <KeyRound size={13} /> Set Password
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  )
}
