"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setLoading(true)
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (result?.error) setError("Invalid email or password")
    else { router.push("/dashboard"); router.refresh() }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#F4F6FA" }}>
      {/* Left Panel */}
      <div style={{ display: "none", width: "45%", background: "var(--sidebar-bg)", flexDirection: "column", justifyContent: "space-between", padding: "40px 48px" }} className="lg-flex">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "white", fontSize: 18 }}>D</div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>DSN HRMS</div>
            <div style={{ color: "var(--sidebar-fg)", fontSize: 12 }}>Data Science Nigeria</div>
          </div>
        </div>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "white", lineHeight: 1.25, marginBottom: 16 }}>
            Manage your people,<br />
            <span style={{ color: "#93C5FD" }}>empower your mission.</span>
          </h1>
          <p style={{ color: "var(--sidebar-fg)", fontSize: 15, lineHeight: 1.7 }}>
            Data Science Nigeria's unified HR platform for employees, leave, performance and insights — all in one place.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[["200+","Employees"],["8","Departments"],["36","States"],["7+","Years"]].map(([v,l]) => (
            <div key={l} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "white" }}>{v}</div>
              <div style={{ fontSize: 13, color: "var(--sidebar-fg)", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Login */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Logo for mobile */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40, justifyContent: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--sidebar-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--accent)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--foreground)" }}>DSN HRMS</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Data Science Nigeria</div>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 20, padding: 40, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid var(--border)" }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--foreground)", marginBottom: 6 }}>Welcome back</h2>
              <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Sign in to your DSN HRMS account</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label htmlFor="email" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>Email address</label>
                <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@datasciencenigeria.org"
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)", transition: "border-color 0.15s" }} />
              </div>
              <div>
                <label htmlFor="password" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>Password</label>
                <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)", transition: "border-color 0.15s" }} />
              </div>

              {error && (
                <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "12px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "all 0.15s", marginTop: 4 }}>
                {loading ? "Signing in..." : "Sign in →"}
              </button>
            </form>

            {/* Demo credentials hint */}
            <div style={{ marginTop: 24, padding: 16, background: "var(--muted)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>Demo Credentials</div>
              {[
                ["Super Admin", "admin@datasciencenigeria.org", "Admin@DSN2024!"],
                ["HR Admin", "hr@datasciencenigeria.org", "Welcome@DSN1"],
              ].map(([role, em, pw]) => (
                <div key={role} style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4, cursor: "pointer" }} onClick={() => { setEmail(em); setPassword(pw) }}>
                  <span style={{ fontWeight: 600, color: "var(--primary)" }}>{role}:</span> {em} / {pw}
                </div>
              ))}
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", marginTop: 24 }}>
            © {new Date().getFullYear()} Data Science Nigeria. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
