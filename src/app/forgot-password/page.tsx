"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Loader2, CheckCircle2, Circle, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react"
import AuthLeftPanel from "@/components/layout/AuthLeftPanel"

type Step = "email" | "code" | "done"

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

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (step !== "done") return
    const t = setTimeout(() => router.push("/login"), 3000)
    return () => clearTimeout(t)
  }, [step, router])

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setStep("code")
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    const pwError = validatePassword(newPassword)
    if (pwError) { setError(pwError); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return }
    setError("")
    setLoading(true)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Something went wrong. Please try again.")
      return
    }
    setStep("done")
  }

  const passwordValid = validatePassword(newPassword) === null
  const canSubmitReset = code.length === 6 && passwordValid && newPassword === confirmPassword

  const iconBg = step === "done" ? "#F0FDF4" : "#EFF6FF"
  const iconColor = step === "done" ? "#22C55E" : "#3B82F6"

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--background)" }}>
      <AuthLeftPanel />

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

          <div style={{ background: "var(--card)", borderRadius: 20, padding: "36px 36px 28px", boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)", border: "1px solid var(--border)" }}>

            {/* Icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {step === "done"
                  ? <CheckCircle2 size={26} style={{ color: iconColor }} />
                  : step === "code"
                  ? <KeyRound size={26} style={{ color: iconColor }} />
                  : <Mail size={26} style={{ color: iconColor }} />}
              </div>
            </div>

            {/* ── Step 1: email ── */}
            {step === "email" && (
              <>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", marginBottom: 6, letterSpacing: "-0.02em" }}>
                    Forgotten your password?
                  </h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.6 }}>
                    Enter your work email and we'll send you a 6-digit reset code.
                  </p>
                </div>

                <form onSubmit={handleSendCode} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
                      Work Email
                    </label>
                    <input
                      type="email" required autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@datasciencenigeria.ai"
                      style={{ width: "100%", padding: "11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <button
                    type="submit" disabled={loading}
                    style={{ background: loading ? "var(--primary-dark)" : "var(--primary)", color: "white", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.85 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 4px 12px rgba(11,92,46,0.30)", width: "100%" }}
                  >
                    {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Sending…</> : "Send Reset Code"}
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <Link href="/login" style={{ fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <ArrowLeft size={13} /> Back to sign in
                  </Link>
                </div>
              </>
            )}

            {/* ── Step 2: code + new password ── */}
            {step === "code" && (
              <>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", marginBottom: 6, letterSpacing: "-0.02em" }}>
                    Check your email
                  </h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.6 }}>
                    A 6-digit code was sent to{" "}
                    <strong style={{ color: "var(--foreground)" }}>{email}</strong>.
                    Enter it below along with your new password.
                  </p>
                </div>

                <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
                      6-Digit Code
                    </label>
                    <input
                      type="text" inputMode="numeric" maxLength={6} autoFocus
                      value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      style={{ width: "100%", padding: "11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 22, fontWeight: 700, letterSpacing: "0.2em", textAlign: "center", color: "var(--foreground)", background: "var(--background)", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
                      New Password
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPw ? "text" : "password"} autoComplete="new-password"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)", outline: "none", boxSizing: "border-box" }}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <PasswordRules password={newPassword} />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
                      Confirm Password
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showConfirm ? "text" : "password"} autoComplete="new-password"
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)", outline: "none", boxSizing: "border-box" }}
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>Passwords do not match</p>
                    )}
                  </div>

                  {error && (
                    <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "11px 14px", borderRadius: 10, fontSize: 13, border: "1px solid var(--danger)", borderLeft: "3px solid var(--danger)" }}>
                      ⚠ {error}
                      {(error.toLowerCase().includes("expired") || error.toLowerCase().includes("invalid")) && (
                        <span>
                          {" "}
                          <button type="button"
                            onClick={() => { setStep("email"); setCode(""); setError("") }}
                            style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: 0 }}>
                            Send a new code
                          </button>
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="submit" disabled={loading || !canSubmitReset}
                    style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: loading || !canSubmitReset ? "not-allowed" : "pointer", opacity: loading || !canSubmitReset ? 0.55 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading || !canSubmitReset ? "none" : "0 4px 12px rgba(11,92,46,0.30)", width: "100%", marginTop: 4 }}
                  >
                    {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Set New Password"}
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button type="button"
                    onClick={() => { setStep("email"); setCode(""); setError("") }}
                    style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <ArrowLeft size={13} /> Use a different email
                  </button>
                </div>
              </>
            )}

            {/* ── Step 3: done ── */}
            {step === "done" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: "var(--foreground)" }}>Password updated</div>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 24 }}>
                  Your password has been reset successfully. You'll be redirected to sign in shortly.
                </p>
                <Link href="/login" style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                  Go to sign in →
                </Link>
              </div>
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
