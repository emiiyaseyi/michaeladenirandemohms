"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle2, Circle } from "lucide-react"

const RULES = [
  { key: "len",   label: "At least 8 characters",         test: (p: string) => p.length >= 8 },
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

function Brand() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 24 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--sidebar-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
        <img src="/dsn-logo.svg" alt="DSN" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "var(--foreground)", letterSpacing: "-0.02em" }}>DSN HRMS</div>
      </div>
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Brand />
        {children}
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--subtle)", marginTop: 20 }}>
          © {new Date().getFullYear()} Data Science Nigeria. All rights reserved.
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function OnboardPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "used" | "expired" | "post-save">("loading")
  const [employeeName, setEmployeeName] = useState("")
  const [employeeEmail, setEmployeeEmail] = useState("")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const [autoLoginPending, setAutoLoginPending] = useState(false)

  useEffect(() => {
    fetch(`/api/onboard/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) {
          if (d.error === "Invalid invite link") return setStatus("invalid")
          if (d.error?.toLowerCase().includes("already")) return setStatus("used")
          if (d.error?.toLowerCase().includes("expired")) return setStatus("expired")
          return setStatus("invalid")
        }
        if (d.employee) {
          setEmployeeName(`${d.employee.firstName} ${d.employee.lastName}`)
          setEmployeeEmail(d.employee.email ?? "")
          setStatus("valid")
        }
      })
      .catch(() => setStatus("invalid"))
  }, [token])

  useEffect(() => {
    // Redirect already-logged-in users straight to their dashboard.
    if (sessionStatus === "authenticated" && session?.user && status !== "post-save") {
      const role = (session.user as any).role
      const dest = role === "SUPER_ADMIN" ? "/admin" : role === "PROJECT_LEAD" ? "/project-lead" : "/staff"
      router.replace(dest)
    }
  }, [session, sessionStatus, router, status])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr("")
    const pwErr = validatePassword(password)
    if (pwErr) { setErr(pwErr); return }
    if (password !== confirm) { setErr("Passwords do not match."); return }

    setSaving(true)
    const r = await fetch(`/api/onboard/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_password", newPassword: password }),
    })
    const d = await r.json()
    if (!r.ok) {
      setSaving(false)
      setErr(d.error ?? "Something went wrong.")
      return
    }

    setStatus("post-save")
    setAutoLoginPending(true)
    try {
      const result = await signIn("credentials", { redirect: false, email: employeeEmail, password })
      if (result?.ok) {
        router.push("/")
        return
      }
    } catch {}
    setAutoLoginPending(false)
  }

  if (sessionStatus === "loading" || status === "loading") {
    return (
      <PageShell>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Loader2 size={32} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} />
        </div>
      </PageShell>
    )
  }

  if (status === "invalid" || status === "used" || status === "expired") {
    const copy =
      status === "invalid" ? { icon: "🔗", title: "Invalid invite link", body: "This invite link is not valid. Please contact your HR administrator." } :
      status === "used"    ? { icon: "✓",   title: "Already used",       body: "You've already set your password. Sign in with your new password instead." } :
                             { icon: "⏰",  title: "Invite link expired", body: "Your invite link has expired. Sign in directly with your work email and default password Welcome@DSN1 - you'll be prompted to set a new password." }
    return (
      <PageShell>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "40px 32px", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>{copy.icon}</div>
          <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8, color: "var(--foreground)" }}>{copy.title}</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: 22 }}>{copy.body}</p>
          <a href="/login" style={{ display: "inline-block", padding: "10px 28px", background: "var(--primary)", color: "white", textDecoration: "none", borderRadius: 8, fontSize: 14, fontWeight: 700 }}>Sign in directly</a>
        </div>
      </PageShell>
    )
  }

  if (status === "post-save") {
    return (
      <PageShell>
        <div style={{ background: "var(--card)", borderRadius: 20, padding: "36px 36px 32px", boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)", border: "1px solid var(--border)", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <CheckCircle2 size={48} style={{ color: "var(--primary)" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", marginBottom: 6, letterSpacing: "-0.02em" }}>
            Password set!
          </h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.6, marginBottom: 22 }}>
            {autoLoginPending
              ? "Signing you in…"
              : "Couldn't sign you in automatically. Click below to continue."}
          </p>
          <button
            type="button"
            disabled={autoLoginPending}
            onClick={() => router.push("/login")}
            style={{
              background: "var(--primary)", color: "white", border: "none",
              borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700,
              cursor: autoLoginPending ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              minWidth: 180, minHeight: 44,
              boxShadow: "0 4px 12px rgba(11,92,46,0.25)",
              opacity: autoLoginPending ? 0.95 : 1,
            }}
          >
            {autoLoginPending
              ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: "white" }} />
              : "Go to Login"}
          </button>
        </div>
      </PageShell>
    )
  }

  // ── status === "valid" - set-password form ─────────────────────────────────
  return (
    <PageShell>
      <div style={{ background: "var(--card)", borderRadius: 20, padding: "36px 36px 28px", boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <KeyRound size={26} color="white" />
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", marginBottom: 6, letterSpacing: "-0.02em" }}>
            Welcome, {employeeName.split(" ")[0] || "there"}
          </h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.6 }}>
            Set a password for <strong style={{ color: "var(--foreground)" }}>{employeeEmail}</strong> to finish setting up your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 7 }}>New password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"} required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)" }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordRules password={password} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 7 }}>Confirm password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"} required
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--background)" }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {err && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "11px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid var(--danger)", borderLeft: "3px solid var(--danger)" }}>
              ⚠ {err}
            </div>
          )}

          <button
            type="submit" disabled={saving}
            style={{ background: saving ? "var(--primary-dark)" : "var(--primary)", color: "white", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.85 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4, boxShadow: saving ? "none" : "0 4px 12px rgba(11,92,46,0.30)" }}>
            {saving ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Setting password…</> : "Set password"}
          </button>
        </form>
      </div>
    </PageShell>
  )
}
