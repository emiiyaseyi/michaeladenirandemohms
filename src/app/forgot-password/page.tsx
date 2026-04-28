"use client"
import { useState } from "react"
import Link from "next/link"
import { Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (!res.ok) { setError("Something went wrong. Please try again."); return }
    setDone(true)
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
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={26} style={{ color: "#3B82F6" }} />
            </div>
          </div>

          {done ? (
            <div style={{ textAlign: "center" }}>
              <CheckCircle2 size={40} style={{ color: "var(--primary)", marginBottom: 12 }} />
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Request sent</div>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 24 }}>
                Your request has been sent to HR. An admin will reset your password and contact you with your new credentials. Please check your WhatsApp or email.
              </p>
              <Link href="/login" style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", marginBottom: 6, letterSpacing: "-0.02em" }}>
                  Forgotten your password?
                </h2>
                <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.6 }}>
                  Enter your work email and we'll notify an admin to reset your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 7 }}>
                    Work Email
                  </label>
                  <input
                    type="email" required autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@datasciencenigeria.ai"
                    style={{ width: "100%", padding: "11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)" }}
                  />
                </div>

                {error && (
                  <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "11px 14px", borderRadius: 10, fontSize: 13, border: "1px solid var(--danger)", borderLeft: "3px solid var(--danger)" }}>
                    ⚠ {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{ background: loading ? "var(--primary-dark)" : "var(--primary)", color: "white", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.85 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 4px 12px rgba(11,92,46,0.30)" }}
                >
                  {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Sending…</> : "Send Request"}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: 20 }}>
                <Link href="/login" style={{ fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <ArrowLeft size={13} /> Back to sign in
                </Link>
              </div>
            </>
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
