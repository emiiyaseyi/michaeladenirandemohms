"use client"
import { useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2 } from "lucide-react"

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
    if (newPw.length < 8) { setError("Password must be at least 8 characters."); return }
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 900, fontSize: 24, color: "var(--foreground)", letterSpacing: "-0.03em" }}>DSN HRMS</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3 }}>Data Science Nigeria</div>
        </div>

        <div style={{
          background: "var(--card)", borderRadius: 20, padding: 40,
          boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)",
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

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--subtle)", marginTop: 24 }}>
          © {new Date().getFullYear()} Data Science Nigeria. All rights reserved.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
