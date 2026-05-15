"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import { Check, Loader2, ChevronLeft, Eye, EyeOff } from "lucide-react"

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}
const maxDob = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 13); return d.toISOString().split("T")[0] })()

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Must be at least 8 characters"
  if (!/[A-Z]/.test(pw)) return "Must contain an uppercase letter"
  if (!/[0-9]/.test(pw)) return "Must contain a number"
  if (!/[^A-Za-z0-9]/.test(pw)) return "Must contain a special character"
  return null
}

const STEPS = ["Set Password", "Personal Info", "Home Address", "Next of Kin"]

export default function OnboardPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "used" | "expired" | "done" | "logging-in">("loading")
  const [employeeName, setEmployeeName] = useState("")
  const [employeeEmail, setEmployeeEmail] = useState("")
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [personal, setPersonal] = useState({ gender: "", dateOfBirth: "", maritalStatus: "", phone: "", alternatePhone: "", personalEmail: "" })
  const [address, setAddress] = useState({ address: "", city: "", state: "", country: "Nigeria", postalCode: "" })
  const [nok, setNok] = useState({ nokName: "", nokPhone: "", nokRelationship: "" })

  useEffect(() => {
    fetch(`/api/onboard/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error === "Invalid invite link") { setStatus("invalid"); return }
        if (d.error === "This invite has already been used") { setStatus("used"); return }
        if (d.error?.includes("expired")) { setStatus("expired"); return }
        if (d.employee) {
          setEmployeeName(`${d.employee.firstName} ${d.employee.lastName}`)
          setEmployeeEmail(d.employee.email ?? "")
          setStatus("valid")
        }
      })
      .catch(() => setStatus("invalid"))
  }, [token])

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user) {
      const role = (session.user as any).role
      const dest = role === "SUPER_ADMIN" ? "/admin" : role === "PROJECT_LEAD" ? "/project-lead" : "/staff"
      router.replace(dest)
    }
  }, [session, sessionStatus, router])

  const setP = (k: keyof typeof personal) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPersonal(p => ({ ...p, [k]: e.target.value }))
  const setA = (k: keyof typeof address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress(a => ({ ...a, [k]: e.target.value }))
  const setN = (k: keyof typeof nok) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setNok(n => ({ ...n, [k]: e.target.value }))

  const setPasswordAndContinue = async () => {
    setErr("")
    if (!password) { setErr("Please enter a password"); return }
    const pwErr = validatePassword(password)
    if (pwErr) { setErr(pwErr); return }
    if (password !== confirm) { setErr("Passwords do not match"); return }
    setSaving(true)
    const r = await fetch(`/api/onboard/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_password", newPassword: password }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setErr(d.error ?? "Something went wrong"); return }
    setStep(1)
  }

  const submitProfile = async () => {
    setSaving(true); setErr("")
    const r = await fetch(`/api/onboard/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...personal, ...address, ...nok }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setErr(d.error ?? "Something went wrong"); return }

    // Auto-login with the password they set
    setStatus("logging-in")
    const result = await signIn("credentials", {
      redirect: false,
      email: employeeEmail,
      password,
    })
    if (result?.ok) {
      // Redirect will happen via session check in useEffect
      setStatus("done")
    } else {
      setStatus("done")
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px",
  }
  const cardStyle: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 620, overflow: "hidden",
  }

  if (sessionStatus === "loading" || status === "loading") return (
    <div style={containerStyle}>
      <Loader2 size={32} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (status === "logging-in") return (
    <div style={containerStyle}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Loader2 size={32} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} />
        <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Signing you in…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (status === "invalid") return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ padding: "48px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Invalid Invite Link</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>This invite link is not valid. Please contact your HR administrator.</p>
        </div>
      </div>
    </div>
  )

  if (status === "used") return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ padding: "48px 40px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={28} style={{ color: "#16a34a" }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Already Completed</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>You have already submitted your profile. Contact HR if you need to make changes.</p>
        </div>
      </div>
    </div>
  )

  if (status === "expired") return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ padding: "48px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Invite Link Expired</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
            This invite link has expired. Your default password is <strong>Welcome@DSN1</strong> — log in at the <a href="/login" style={{ color: "var(--primary)" }}>login page</a> and you will be prompted to change your password.
          </p>
        </div>
      </div>
    </div>
  )

  if (status === "done") return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ padding: "48px 40px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Check size={28} style={{ color: "#16a34a" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Profile Complete!</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
            Thank you, {employeeName}. Your profile has been submitted. Taking you to your dashboard…
          </p>
          <Loader2 size={20} style={{ animation: "spin .8s linear infinite", color: "var(--primary)", marginTop: 16 }} />
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", background: "var(--primary)" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 4 }}>Welcome, {employeeName}!</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Let's get your account set up in a few quick steps.</p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", padding: "16px 32px", borderBottom: "1px solid var(--border)", gap: 0, overflowX: "auto" }}>
          {STEPS.map((s, i) => {
            const done = i < step; const active = i === step
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#16a34a" : active ? "var(--primary)" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", color: done || active ? "white" : "var(--muted-foreground)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {done ? <Check size={14} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? "var(--foreground)" : "var(--muted-foreground)", whiteSpace: "nowrap" }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: done ? "#16a34a" : "var(--border)", margin: "0 8px", marginTop: -14 }} />}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div style={{ padding: "28px 32px" }}>

          {/* Step 0: Set Password */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                Set a secure password for your account. You will use this to log in going forward.
              </p>
              <Field label="Account Email">
                <input value={employeeEmail} readOnly style={{ ...fi, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "not-allowed" }} />
              </Field>
              <Field label="New Password" required>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ ...fi, paddingRight: 42 }}
                    placeholder="Min 8 chars, uppercase, number, symbol"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password" required>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    style={{ ...fi, paddingRight: 42 }}
                    placeholder="Re-enter your password"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
            </div>
          )}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Gender" required>
                <select value={personal.gender} onChange={setP("gender")} style={{ ...fi, appearance: "none" }}>
                  <option value="">Select…</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={personal.dateOfBirth} onChange={setP("dateOfBirth")} max={maxDob} style={fi} />
              </Field>
              <Field label="Marital Status">
                <select value={personal.maritalStatus} onChange={setP("maritalStatus")} style={{ ...fi, appearance: "none" }}>
                  <option value="">Select…</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </Field>
              <Field label="Phone Number" required>
                <input value={personal.phone} onChange={setP("phone")} style={fi} placeholder="e.g. 08012345678" />
              </Field>
              <Field label="Alternate Phone">
                <input value={personal.alternatePhone} onChange={setP("alternatePhone")} style={fi} placeholder="Optional" />
              </Field>
              <Field label="Personal Email">
                <input type="email" value={personal.personalEmail} onChange={setP("personalEmail")} style={fi} placeholder="personal@email.com" />
              </Field>
            </div>
          )}

          {/* Step 2: Home Address */}
          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="Street Address">
                  <input value={address.address} onChange={setA("address")} style={fi} placeholder="e.g. 12 Marina Road" />
                </Field>
              </div>
              <Field label="City">
                <input value={address.city} onChange={setA("city")} style={fi} placeholder="e.g. Lagos" />
              </Field>
              <Field label="State / Province">
                <input value={address.state} onChange={setA("state")} style={fi} placeholder="e.g. Lagos" />
              </Field>
              <Field label="Country">
                <input value={address.country} onChange={setA("country")} style={fi} />
              </Field>
              <Field label="Postal Code">
                <input value={address.postalCode} onChange={setA("postalCode")} style={fi} placeholder="e.g. 100001" />
              </Field>
            </div>
          )}

          {/* Step 3: Next of Kin */}
          {step === 3 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Full Name">
                <input value={nok.nokName} onChange={setN("nokName")} style={fi} placeholder="e.g. Jane Doe" />
              </Field>
              <Field label="Phone Number">
                <input value={nok.nokPhone} onChange={setN("nokPhone")} style={fi} placeholder="Phone number" />
              </Field>
              <Field label="Relationship">
                <input value={nok.nokRelationship} onChange={setN("nokRelationship")} style={fi} placeholder="e.g. Spouse" />
              </Field>
            </div>
          )}

          {err && <div style={{ marginTop: 16, padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
          {step > 0 ? (
            <button onClick={() => { setStep(s => s - 1); setErr("") }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              <ChevronLeft size={15} /> Back
            </button>
          ) : <div />}

          {step === 0 ? (
            <button onClick={setPasswordAndContinue} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
              {saving && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
              {saving ? "Setting…" : "Set Password & Continue"}
            </button>
          ) : step < STEPS.length - 1 ? (
            <button onClick={() => { setStep(s => s + 1); setErr("") }} style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>Next</button>
          ) : (
            <button onClick={submitProfile} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
              {saving && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
              {saving ? "Submitting…" : "Submit Profile"}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
