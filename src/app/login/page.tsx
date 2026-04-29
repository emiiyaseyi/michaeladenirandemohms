"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"
import AuthLeftPanel from "@/components/layout/AuthLeftPanel"

const DEMOS: [string, string, string, string][] = [
  ["A", "Admin",     "admin@dsn-hrms.com",    "Admin@DSN2024!"],
  ["T", "Team Lead", "teamlead@dsn-hrms.com", "dsn-demo"],
  ["S", "Staff",     "staff@dsn-hrms.com",    "dsn-demo"],
]


export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const fill = (e: string, p: string) => { setEmail(e); setPassword(p); setError("") }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(""); setLoading(true)
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (result?.error) setError("Invalid email or password.")
    else { router.push("/"); router.refresh() }
  }

  const inputStyle = (field: string) => ({
    width: "100%", padding: "11px 14px",
    border: `1.5px solid ${focusedField === field ? "var(--primary)" : "var(--border)"}`,
    borderRadius: 10, fontSize: 14,
    color: "var(--foreground)", background: "var(--background)",
    outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(18,163,85,0.12)" : "none",
    boxSizing: "border-box" as const,
  })

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--background)" }}>

      <AuthLeftPanel />

      {/* ── Right panel ── */}
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

          {/* Card */}
          <div style={{
            background: "var(--card)", borderRadius: 20, padding: "36px 36px 28px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid var(--border)",
          }}>
            {/* Heading */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", marginBottom: 5, letterSpacing: "-0.02em" }}>Welcome back</h2>
              <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.5 }}>Sign in to your DSN HRMS account</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Email */}
              <div>
                <label htmlFor="email" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6, letterSpacing: "0.01em" }}>
                  Email address
                </label>
                <input
                  id="email" type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@datasciencenigeria.ai"
                  style={inputStyle("email")}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6, letterSpacing: "0.01em" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password" type={showPw ? "text" : "password"} required autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    style={{ ...inputStyle("password"), paddingRight: 44 }}
                  />
                  <button
                    type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--muted-foreground)", padding: 2, borderRadius: 4,
                      display: "flex", alignItems: "center",
                    }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: "#FFF1F2", color: "#BE123C",
                  padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: "1px solid #FECDD3",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 15 }}>⚠</span> {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  background: loading ? "var(--primary-dark)" : "var(--primary)",
                  color: "white", border: "none", borderRadius: 10,
                  padding: "12px", fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.85 : 1,
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginTop: 2,
                  boxShadow: loading ? "none" : "0 4px 14px rgba(18,163,85,0.32)",
                  width: "100%",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)" }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "translateY(0)" }}
              >
                {loading
                  ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Signing in…</>
                  : <>Sign in <ArrowRight size={15} /></>}
              </button>
            </form>

            {/* Demo credentials */}
            <div style={{ marginTop: 24, padding: 16, background: "var(--muted)", borderRadius: 12, border: "1px solid var(--border)" }}>
              {DEMOS.map(([initial, role, em, pw]) => (
                <div
                  key={role}
                  style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4, cursor: "pointer", padding: "7px 8px", borderRadius: 6, transition: "background 0.12s", display: "flex", alignItems: "center", gap: 8 }}
                  onClick={() => fill(em, pw)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--border)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 11, minWidth: 72 }}>{role}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{em}</span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "var(--subtle)", margin: "8px 0 0", textAlign: "center" }}>Click a row to auto-fill</p>
            </div>
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
