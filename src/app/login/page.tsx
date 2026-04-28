"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"

const stats = [["60+","Employees"],["17","Departments"],["36","States"],["7+","Years"]]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setLoading(true)
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (result?.error) setError("Invalid email or password. Please try again.")
    else { router.push("/"); router.refresh() }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--background)" }}>

      {/* ── Left Panel ── */}
      <div className="lg-flex" style={{
        display: "none", width: "44%", background: "var(--sidebar-bg)",
        flexDirection: "column", justifyContent: "space-between", padding: "44px 52px",
      }}>
        {/* Brand */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "white", letterSpacing: "-0.02em" }}>DSN HRMS</div>
          <div style={{ fontSize: 13, color: "var(--sidebar-fg)" }}>Data Science Nigeria</div>
        </div>

        {/* Hero text */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(227,25,42,0.15)", borderRadius: 20, padding: "4px 12px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E3192A", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "#F87171", fontWeight: 600 }}>HR Platform</span>
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: "white", lineHeight: 1.18, marginBottom: 18, letterSpacing: "-0.03em" }}>
            Manage your people,<br />
            <span style={{ color: "#12A355" }}>empower your mission.</span>
          </h1>
          <p style={{ color: "var(--sidebar-fg)", fontSize: 15, lineHeight: 1.75, maxWidth: 380 }}>
            DSN's unified HR platform for employees, leave, performance and insights — all in one place.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {stats.map(([v, l]) => (
            <div key={l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: "white", letterSpacing: "-0.04em" }}>{v}</div>
              <div style={{ fontSize: 13, color: "var(--sidebar-fg)", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Mobile brand — only visible when left panel is hidden (small screens) */}
          <div className="lg-hide" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "var(--foreground)", letterSpacing: "-0.02em" }}>DSN HRMS</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Data Science Nigeria</div>
          </div>

          {/* Card */}
          <div style={{
            background: "var(--card)", borderRadius: 20, padding: 40,
            boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)",
          }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--foreground)", marginBottom: 6, letterSpacing: "-0.02em" }}>Welcome back</h2>
              <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Sign in to your DSN HRMS account</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Email */}
              <div>
                <label htmlFor="email" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 7 }}>
                  Email address
                </label>
                <input
                  id="email" type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@datasciencenigeria.ai"
                  style={{
                    width: "100%", padding: "11px 14px",
                    border: "1.5px solid var(--border)", borderRadius: 10,
                    fontSize: 14, color: "var(--foreground)", background: "var(--background)",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 7 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password" type={showPw ? "text" : "password"} required autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%", padding: "11px 44px 11px 14px",
                      border: "1.5px solid var(--border)", borderRadius: 10,
                      fontSize: 14, color: "var(--foreground)", background: "var(--background)",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--muted-foreground)", padding: 2, borderRadius: 4,
                      display: "flex", alignItems: "center",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--primary)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: "var(--danger-bg)", color: "var(--danger)",
                  padding: "11px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                  border: "1px solid var(--danger)", borderLeft: "3px solid var(--danger)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span>⚠</span> {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  background: loading ? "var(--primary-dark)" : "var(--primary)",
                  color: "white", border: "none", borderRadius: 10, padding: "12px",
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.85 : 1,
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginTop: 4,
                  boxShadow: loading ? "none" : "0 4px 12px rgba(11,92,46,0.30)",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--primary-light)" }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--primary)" }}
              >
                {loading
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Signing in…</>
                  : <> Sign in <ArrowRight size={15} /></>
                }
              </button>
            </form>

            {/* Forgot password */}
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Link href="/forgot-password" style={{ fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none" }}>
                Forgotten your password?
              </Link>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: "var(--subtle)", marginTop: 24 }}>
            © {new Date().getFullYear()} Data Science Nigeria. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
