"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Avatar from "@/components/ui/Avatar"
import { useRouter } from "next/navigation"
import {
  User, Phone, Mail, MapPin, Building2, Heart, Banknote,
  UserCheck, Save, ArrowLeft, Camera, CheckCircle, AlertCircle, Loader2, Clock,
} from "lucide-react"

const fi = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
} as const

const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid var(--border)" }}>
    <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={14} color="white" />
    </div>
    <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
  </div>
)

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--foreground)" }}>
      {label} {required && <span style={{ color: "var(--accent)" }}>*</span>}
    </label>
    {children}
  </div>
)

export default function EditProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<Record<string, string>>({})
  const [pendingRequest, setPendingRequest] = useState<any>(null)

  useEffect(() => {
    fetch("/api/self-service/profile")
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); setLoading(false) })
    fetch("/api/profile-requests")
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => {
        const pending = (d.requests ?? []).find((r: any) => r.status === "PENDING")
        setPendingRequest(pending ?? null)
      })
      .catch(() => {})
  }, [])

  // Also fetch raw employee data for form pre-fill
  useEffect(() => {
    fetch("/api/self-service/employee-raw")
      .then(r => r.json())
      .then(d => {
        if (d.employee) {
          const e = d.employee
          setForm({
            phone: e.phone ?? "", alternatePhone: e.alternatePhone ?? "",
            personalEmail: e.personalEmail ?? "",
            address: e.address ?? "", city: e.city ?? "", state: e.state ?? "",
            country: e.country ?? "Nigeria", postalCode: e.postalCode ?? "",
            gender: e.gender ?? "", dateOfBirth: e.dateOfBirth ? e.dateOfBirth.split("T")[0] : "",
            maritalStatus: e.maritalStatus ?? "", nationality: e.nationality ?? "Nigerian",
            stateOfOrigin: e.stateOfOrigin ?? "",
            nokName: e.nokName ?? "", nokPhone: e.nokPhone ?? "",
            nokRelationship: e.nokRelationship ?? "", nokAddress: e.nokAddress ?? "",
            bankName: e.bankName ?? "", bankAccountNo: e.bankAccountNo ?? "",
            bankAccountName: e.bankAccountName ?? "",
          })
        }
      })
      .catch(() => {})
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const save = async () => {
    setSaving(true); setError("")
    try {
      const r = await fetch("/api/self-service/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (r.ok) {
        setSaved(true)
        setPendingRequest(d.direct ? null : (d.request ?? null))
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(d.error ?? "Failed to submit")
      }
    } catch {
      setError("Network error, please try again")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <button onClick={() => router.back()} style={{ background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--foreground)", flexShrink: 0, marginTop: 2 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800 }}>Edit Profile</h1>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3, lineHeight: 1.5 }}>Changes require HR approval before taking effect.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {error && <span style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={13} />{error}</span>}
          {saved && <span style={{ fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={13} />{pendingRequest ? "Submitted for review!" : "Profile updated!"}</span>}
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : <><Save size={13} /> Save Changes</>}
          </Button>
        </div>
      </div>

      {/* Profile photo section */}
      <Card>
        <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative" }}>
            <Avatar name={profile?.fullName ?? "?"} photo={profile?.profilePhoto} size={72} />
            <button style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%", background: "var(--primary)", border: "2px solid var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Camera size={12} color="white" />
            </button>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{profile?.fullName}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{profile?.jobTitle} · {profile?.department}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
              <span style={{ background: "var(--muted)", borderRadius: 4, padding: "2px 7px" }}>ID: {profile?.employeeId}</span>
              <span style={{ background: "var(--muted)", borderRadius: 4, padding: "2px 7px" }}>{profile?.completeness}% complete</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Pending review banner */}
      {pendingRequest && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: "#FFFBEB", border: "1px solid #F59E0B", borderRadius: 10, fontSize: 13 }}>
          <Clock size={16} style={{ color: "#F59E0B", flexShrink: 0 }} />
          <div>
            <strong style={{ color: "#92400E" }}>Update pending review</strong>
            <span style={{ color: "#78350F", marginLeft: 6 }}>You have a profile update awaiting HR approval. Submitting again will replace the pending request.</span>
          </div>
        </div>
      )}

      {/* Personal Info */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle icon={User} title="Personal Information" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
            <Field label="Date of Birth">
              <input type="date" value={form.dateOfBirth ?? ""} onChange={set("dateOfBirth")} style={fi} />
            </Field>
            <Field label="Gender">
              <select value={form.gender ?? ""} onChange={set("gender")} style={fi}>
                <option value="">Select…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </Field>
            <Field label="Marital Status">
              <select value={form.maritalStatus ?? ""} onChange={set("maritalStatus")} style={fi}>
                <option value="">Select…</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            </Field>
            <Field label="Nationality">
              <input type="text" value={form.nationality ?? ""} onChange={set("nationality")} placeholder="e.g. Nigerian" style={fi} />
            </Field>
            <Field label="State of Origin">
              <input type="text" value={form.stateOfOrigin ?? ""} onChange={set("stateOfOrigin")} placeholder="e.g. Lagos" style={fi} />
            </Field>
          </div>
        </div>
      </Card>

      {/* Contact */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle icon={Phone} title="Contact Information" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
            <Field label="Phone Number" required>
              <input type="tel" value={form.phone ?? ""} onChange={set("phone")} placeholder="e.g. 08012345678" style={fi} />
            </Field>
            <Field label="Alternate Phone">
              <input type="tel" value={form.alternatePhone ?? ""} onChange={set("alternatePhone")} placeholder="Optional" style={fi} />
            </Field>
            <Field label="Personal Email" required>
              <input type="email" value={form.personalEmail ?? ""} onChange={set("personalEmail")} placeholder="your@email.com" style={fi} />
            </Field>
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle icon={MapPin} title="Residential Address" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Street Address" required>
              <input type="text" value={form.address ?? ""} onChange={set("address")} placeholder="House number and street" style={fi} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 12 }}>
              <Field label="City" required>
                <input type="text" value={form.city ?? ""} onChange={set("city")} placeholder="City" style={fi} />
              </Field>
              <Field label="State" required>
                <input type="text" value={form.state ?? ""} onChange={set("state")} placeholder="State" style={fi} />
              </Field>
              <Field label="Postal Code">
                <input type="text" value={form.postalCode ?? ""} onChange={set("postalCode")} placeholder="100001" style={fi} />
              </Field>
            </div>
          </div>
        </div>
      </Card>

      {/* Next of Kin */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle icon={Heart} title="Next of Kin" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
            <Field label="Full Name" required>
              <input type="text" value={form.nokName ?? ""} onChange={set("nokName")} placeholder="Full name" style={fi} />
            </Field>
            <Field label="Phone Number" required>
              <input type="tel" value={form.nokPhone ?? ""} onChange={set("nokPhone")} placeholder="08012345678" style={fi} />
            </Field>
            <Field label="Relationship" required>
              <select value={form.nokRelationship ?? ""} onChange={set("nokRelationship")} style={fi}>
                <option value="">Select…</option>
                {["Spouse", "Parent", "Sibling", "Child", "Other"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Address">
              <input type="text" value={form.nokAddress ?? ""} onChange={set("nokAddress")} placeholder="Address" style={fi} />
            </Field>
          </div>
        </div>
      </Card>

      {/* Bank Details */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle icon={Banknote} title="Bank Details" />
          <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--warning)", display: "flex", gap: 8 }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            Bank details changes are reviewed by HR before taking effect on payroll.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
            <Field label="Bank Name" required>
              <input type="text" value={form.bankName ?? ""} onChange={set("bankName")} placeholder="e.g. Access Bank" style={fi} />
            </Field>
            <Field label="Account Number" required>
              <input type="text" value={form.bankAccountNo ?? ""} onChange={set("bankAccountNo")} placeholder="10-digit account number" style={fi} maxLength={10} />
            </Field>
            <Field label="Account Name" required>
              <input type="text" value={form.bankAccountName ?? ""} onChange={set("bankAccountName")} placeholder="Account name as on bank" style={fi} />
            </Field>
          </div>
        </div>
      </Card>

      {/* Sticky save bar */}
      <div style={{ position: "sticky", bottom: 0, background: "var(--card)", borderTop: "1px solid var(--border)", padding: "12px 0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button variant="secondary" size="sm" onClick={() => router.back()}>Cancel</Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : <><Save size={13} /> Save Changes</>}
        </Button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
