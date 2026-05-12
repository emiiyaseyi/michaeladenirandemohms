"use client"
import { useState } from "react"
import Card from "@/components/ui/Card"
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2, Circle } from "lucide-react"

const RULES = [
  { key: "len",   label: "At least 8 characters",       test: (p: string) => p.length >= 8 },
  { key: "upper", label: "At least one uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "num",   label: "At least one number",          test: (p: string) => /[0-9]/.test(p) },
  { key: "sym",   label: "At least one symbol",          test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  { key: "space", label: "No spaces",                    test: (p: string) => p.length > 0 && !/\s/.test(p) },
]

function validatePassword(pw: string): string | null {
  if (/\s/.test(pw)) return "Password must not contain spaces."
  if (pw.length < 8) return "Password must be at least 8 characters."
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter."
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number."
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain at least one symbol (e.g. !@#$%)."
  return null
}

function PasswordRules({ password }: { password: string }) {
  if (!password) return null
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px", background: "var(--muted)", borderRadius: 8, marginTop: 6 }}>
      {RULES.map(r => {
        const ok = r.test(password)
        return (
          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
            {ok
              ? <CheckCircle2 size={13} style={{ color: "var(--success, #16a34a)", flexShrink: 0 }} />
              : <Circle size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
            <span style={{ color: ok ? "var(--success, #16a34a)" : "var(--muted-foreground)" }}>{r.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function ChangePasswordPage() {
  const [currentPw, setCurrentPw]   = useState("")
  const [newPw, setNewPw]           = useState("")
  const [confirm, setConfirm]       = useState("")
  const [showCurr, setShowCurr]     = useState(false)
  const [showNew, setShowNew]       = useState(false)
  const [showConf, setShowConf]     = useState(false)
  const [error, setError]           = useState("")
  const [loading, setLoading]       = useState(false)
  const [success, setSuccess]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const pwError = validatePassword(newPw)
    if (pwError) { setError(pwError); return }
    if (newPw !== confirm) { setError("Passwords do not match."); return }

    setLoading(true)
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error || "Something went wrong."); return }

    setSuccess(true)
    setCurrentPw(""); setNewPw(""); setConfirm("")
  }

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggle: () => void,
    placeholder: string,
  ) => (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 7 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"} required
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)", boxSizing: "border-box" }}
        />
        <button type="button" onClick={toggle} tabIndex={-1}
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Change Password</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
          Update your account password. You will stay signed in after changing it.
        </p>
      </div>

      <Card>
        <div style={{ padding: "28px 28px" }}>
          {/* Icon row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Password Security</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Min. 8 characters recommended</div>
            </div>
          </div>

          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--success-bg, #E6F4EA)", color: "var(--success, #1A7336)", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600, border: "1px solid var(--success, #1A7336)" }}>
              <CheckCircle2 size={16} /> Password updated successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {field("Current Password", currentPw, setCurrentPw, showCurr, () => setShowCurr(v => !v), "Enter your current password")}
            <div>
              {field("New Password", newPw, setNewPw, showNew, () => setShowNew(v => !v), "Min. 8 characters")}
              <PasswordRules password={newPw} />
            </div>
            {field("Confirm New Password", confirm, setConfirm, showConf, () => setShowConf(v => !v), "Repeat your new password")}

            {error && (
              <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "11px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid var(--danger)", borderLeft: "3px solid var(--danger)" }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{ background: loading ? "var(--primary-dark)" : "var(--primary)", color: "white", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.85 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "flex-start", boxShadow: loading ? "none" : "0 4px 12px rgba(11,92,46,0.25)" }}
            >
              {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Updating…</> : "Update Password"}
            </button>
          </form>
        </div>
      </Card>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
