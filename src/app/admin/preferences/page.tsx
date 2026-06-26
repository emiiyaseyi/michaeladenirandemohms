"use client"
import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import { User, Eye, EyeOff } from "lucide-react"
import Modal from "@/components/ui/Modal"

function FieldLabel({ required, children }: { required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
      {required && <span style={{ color: "#EF4444", marginRight: 3 }}>*</span>}
      {children}
    </label>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
      onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)" }}
      onBlur={e => { e.currentTarget.style.borderColor = "var(--border)" }}
    />
  )
}


function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ marginBottom: 18 }}>
      <FieldLabel required>{label}</FieldLabel>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: "100%", padding: "10px 42px 10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
          onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)" }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--border)" }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 0 }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

function Row({ label, sub, value }: { label: string; sub?: string; value: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div>
        {value
          ? <span style={{ fontSize: 14, color: "var(--foreground)" }}>{value}</span>
          : <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 6, background: "#FFFBEB", color: "#92600A", border: "1px solid #FDE68A" }}>Missing details</span>
        }
      </div>
    </div>
  )
}

export default function PreferencesPage() {
  const [data, setData] = useState<{ email: string; name: string; phone: string | null; nin: string | null } | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editNin, setEditNin] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState("")

  useEffect(() => {
    fetch("/api/self-service/preferences")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
  }, [])

  function openEdit() {
    if (!data) return
    setEditNin(data.nin ?? "")
    setEditPhone(data.phone ?? "")
    setEditError("")
    setEditOpen(true)
  }

  async function saveEdit() {
    setEditError("")
    setEditSaving(true)
    const res = await fetch("/api/self-service/profile/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: editPhone || null, nin: editNin || null }),
    })
    setEditSaving(false)
    if (!res.ok) {
      setEditError((await res.json().catch(() => ({}))).error ?? "Failed to save.")
      return
    }
    setData(d => d ? { ...d, phone: editPhone || null, nin: editNin || null } : d)
    setEditOpen(false)
  }

  async function changePassword() {
    setPwError("")
    if (!currentPw || !newPw || !confirmPw) { setPwError("All fields are required."); return }
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return }
    setPwSaving(true)
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    })
    setPwSaving(false)
    if (!res.ok) {
      setPwError((await res.json().catch(() => ({}))).error ?? "Failed to change password.")
      return
    }
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <div style={{ padding: "28px 32px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 28, color: "var(--foreground)" }}>Account Preferences</h1>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>

        {/* Avatar + identity header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={28} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{data?.email ?? "-"}</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{data?.name ?? ""}</div>
          </div>
        </div>

        {/* Personal Details */}
        <div style={{ padding: "0 32px" }}>
          <div style={{ padding: "20px 0 4px", fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)" }}>Personal Details</div>
          <div style={{ borderBottom: "1px solid var(--border)" }} />
          <Row label="Email" sub="Your registered email address" value={data?.email ?? null} />
          <Row label="Phone number" sub="Your registered phone number" value={data?.phone ?? null} />
          <div style={{ padding: "14px 0 20px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={openEdit}
              style={{ padding: "8px 28px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--foreground)", cursor: "pointer" }}
            >
              Edit
            </button>
          </div>
        </div>

        {/* Security */}
        <div style={{ padding: "0 32px", borderTop: "1px solid var(--border)" }}>
          <div style={{ padding: "20px 0 4px", fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)" }}>Security</div>
          <div style={{ borderBottom: "1px solid var(--border)" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 24px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Password</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <span style={{ fontSize: 18, letterSpacing: 4, color: "var(--muted-foreground)", lineHeight: 1 }}>••••••••••••</span>
              <button
                onClick={() => { setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwError(""); setPwOpen(true) }}
                style={{ padding: "8px 22px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--foreground)", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Personal Details Modal ─────────────────────────────────────── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Change your personal details" width={580}>
        <div style={{ padding: "20px 28px 24px" }}>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: 24 }}>
            We&apos;ll use this information to quickly and securely verify your identity over the phone when you call our team. Rest assured, your information is in good hands.
          </p>

          {/* NIN */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>National ID. Number</FieldLabel>
            <TextInput value={editNin} onChange={setEditNin} placeholder="Enter your NIN" />
          </div>

          {/* Mobile */}
          <div style={{ marginBottom: 24 }}>
            <FieldLabel>Mobile number</FieldLabel>
            <TextInput value={editPhone} onChange={setEditPhone} placeholder="e.g. 07034100652" />
          </div>

          {editError && (
            <p style={{ fontSize: 13, color: "#DC2626", marginBottom: 16, padding: "8px 12px", background: "#FEF2F2", borderRadius: 6 }}>{editError}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={() => setEditOpen(false)}
              style={{ padding: "9px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={editSaving}
              style={{ padding: "9px 28px", background: "var(--primary)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "white", cursor: editSaving ? "not-allowed" : "pointer", opacity: editSaving ? 0.7 : 1 }}
            >
              {editSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Change Password Modal ────────────────────────────────────────────── */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change your password" width={520}>
        <div style={{ padding: "20px 28px 24px" }}>
          <div style={{ display: "flex", gap: 12, background: "#FFF7ED", border: "1px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: 8, padding: "14px 16px", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92600A", marginBottom: 3 }}>Important Notice</div>
              <div style={{ fontSize: 13, color: "#92600A", lineHeight: 1.5 }}>You&apos;ll have to sign in again after changing your password.</div>
            </div>
          </div>

          <PasswordInput label="Current password" value={currentPw} onChange={setCurrentPw} />
          <PasswordInput label="New password" value={newPw} onChange={setNewPw} />
          <PasswordInput label="Confirm new password" value={confirmPw} onChange={setConfirmPw} />

          {pwError && (
            <p style={{ fontSize: 13, color: "#DC2626", marginBottom: 16, padding: "8px 12px", background: "#FEF2F2", borderRadius: 6 }}>{pwError}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
            <button
              onClick={changePassword}
              disabled={pwSaving}
              style={{ padding: "10px 36px", background: "var(--primary)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "white", cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.7 : 1 }}
            >
              {pwSaving ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
