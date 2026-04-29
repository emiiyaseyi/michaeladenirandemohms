"use client"
import { useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2, Circle } from "lucide-react"
import AuthLeftPanel from "@/components/layout/AuthLeftPanel"

const RULES = [
  { key: "len",   label: "At least 8 characters",        test: (p: string) => p.length >= 8 },
  { key: "upper", label: "At least one uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "num",   label: "At least one number",           test: (p: string) => /[0-9]/.test(p) },
  { key: "sym",   label: "At least one symbol",           test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  { key: "space", label: "No spaces",                     test: (p: string) => p.length > 0 && !/\s/.test(p) },
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

export default function FirstLoginPage() {
  const router = useRouter()
  const [newPw, setNewPw]       = useState("")
  const [confirm, setConfirm]   = useState("")
  const [showNew, setShowNew]   = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

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
      body: JSON.stringify({ newPassword: newPw, mode: "first-login" }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error || "Something went wrong."); return }

    setDone(true)
    setTimeout(async () => {
      await signOut({ redirect: false })
      router.push("/login")
    }, 1800)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--background)" }}>

      <AuthLeftPanel />

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Mobile brand */}
        <div className="lg-hide" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 36 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--sidebar-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, marginBottom: 4 }}>
            <img src="/dsn-logo.svg" alt="DSN" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--foreground)", letterSpacing: "-0.02em" }}>DSN HRMS</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Data Science Nigeria</div>
        </div>

        <div style={{
          background: "var(--card)", borderRadius: 20, padding: "36px 36px 28px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
          border: "1px solid var(--border)",
        }}>
          {/* Icon */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound size={26} color="white" />
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", marginBottom: 6, letterSpacing: "-0.02em" }}>
              Set your password
            </h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.6 }}>
              This is your first sign-in. Please set a new password to continue.
            </p>
          </div>

          {done ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CheckCircle2 size={40} style={{ color: "var(--primary)", marginBottom: 12 }} />
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Password set!</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Redirecting you to sign in…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* New password */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 7 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNew ? "text" : "password"} required
                    value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="Min. 8 characters"
                    style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)" }}
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordRules password={newPw} />
              </div>

              {/* Confirm password */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 7 }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConf ? "text" : "password"} required
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)" }}
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)} tabIndex={-1}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "11px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid var(--danger)", borderLeft: "3px solid var(--danger)" }}>
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{ background: loading ? "var(--primary-dark)" : "var(--primary)", color: "white", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.85 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4, boxShadow: loading ? "none" : "0 4px 12px rgba(11,92,46,0.30)" }}
              >
                {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Setting password…</> : "Set Password"}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--subtle)", marginTop: 20 }}>
          © {new Date().getFullYear()} Data Science Nigeria. All rights reserved.
        </p>
      </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .lg-flex { display: none !important; }
        .lg-hide { display: flex !important; }
        @media (min-width: 1024px) {
          .lg-flex { display: flex !important; }
          .lg-hide { display: none !important; }
        }
      `}</style>
    </div>
  )
}
