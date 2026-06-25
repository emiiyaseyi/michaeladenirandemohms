"use client"
import { useState, useEffect, useCallback } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { KeyRound, Eye, EyeOff, XCircle } from "lucide-react"

const RESET_STATUS_META = {
  PENDING:  { bg: "#FFFBEB", color: "#B45309",  label: "Pending"  },
  RESOLVED: { bg: "var(--success-bg,#E6F4EA)", color: "var(--success,#1A7336)", label: "Resolved" },
  REJECTED: { bg: "var(--danger-bg,#FEE2E2)", color: "#DC2626", label: "Dismissed" },
}

const ROLE_LABELS: Record<string, string> = { SUPER_ADMIN: "Super Admin", ADMIN: "Admin", STAFF: "Staff" }

export default function ProfileRequestsPage() {
  const [resets, setResets]     = useState<any[]>([])
  const [loadingR, setLoadingR] = useState(true)
  const [resolving, setResolving] = useState<any | null>(null)
  const [tempPw, setTempPw]     = useState("")
  const [showTempPw, setShowTempPw] = useState(false)
  const [submittingR, setSubmittingR] = useState(false)
  const [resetError, setResetError] = useState("")
  const [rejecting, setRejecting] = useState<any | null>(null)
  const [submittingReject, setSubmittingReject] = useState(false)

  const loadResets = useCallback(async () => {
    setLoadingR(true)
    const res = await fetch("/api/auth/forgot-password")
    const d = res.ok ? await res.json() : { requests: [] }
    setResets(d.requests ?? [])
    setLoadingR(false)
  }, [])

  useEffect(() => { loadResets() }, [loadResets])

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

  async function rejectReset() {
    if (!rejecting) return
    setSubmittingReject(true)
    const res = await fetch(`/api/auth/forgot-password/${rejecting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    })
    setSubmittingReject(false)
    if (!res.ok) return
    setRejecting(null)
    await loadResets()
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>People Requests</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
          Reset employee passwords on request.
        </p>
      </div>

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
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <Button variant="secondary" onClick={() => setRejecting(r)}>
                            Dismiss
                          </Button>
                          <Button onClick={() => { setResolving(r); setTempPw(""); setResetError("") }}>
                            Reset Password
                          </Button>
                        </div>
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

          {rejecting && (
            <Modal open onClose={() => setRejecting(null)} title="Dismiss Reset Request" width={440}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{rejecting.user?.name ?? rejecting.email}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{rejecting.email}</div>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                  This closes the request without changing the employee's password — use this if they remembered it or the request was a mistake. They can submit a new request anytime.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
                  <Button onClick={rejectReset} disabled={submittingReject} style={{ background: "#EF4444", borderColor: "#EF4444" }}>
                    <XCircle size={13} /> {submittingReject ? "Dismissing…" : "Dismiss Request"}
                  </Button>
                </div>
              </div>
            </Modal>
          )}
      </>
    </div>
  )
}
