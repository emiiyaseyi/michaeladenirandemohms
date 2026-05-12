"use client"
import { Loader2 } from "lucide-react"
import { NIGERIAN_STATES } from "@/lib/nigeria-data"

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 13px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none",
}
const sel: React.CSSProperties = { ...fi, appearance: "none" as any, cursor: "pointer" }

export type WpForm = {
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  country: string
  zipCode: string
  phone: string
  email: string
  displayName: string
}

export function emptyWpForm(): WpForm {
  return { addressLine1: "", addressLine2: "", city: "", state: "", country: "Nigeria", zipCode: "", phone: "", email: "", displayName: "" }
}

interface Props {
  form: WpForm
  setForm: (f: WpForm) => void
  saving: boolean
  error: string
  onCancel: () => void
  onSave: () => void
  isFilingOrMailing?: boolean
  isActive?: boolean
  onToggleActive?: () => void
}

export function WorkplaceFormBody({ form, setForm, saving, error, onCancel, onSave, isFilingOrMailing, isActive, onToggleActive }: Props) {
  const set = (k: keyof WpForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Address line 1 <span style={{ color: "#ef4444" }}>*</span></label>
          <input value={form.addressLine1} onChange={set("addressLine1")} style={fi} placeholder="Street address" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Zip Code</label>
          <input value={form.zipCode} onChange={set("zipCode")} style={fi} placeholder="e.g. 10001" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Address line 2</label>
          <input value={form.addressLine2} onChange={set("addressLine2")} style={fi} placeholder="Apartment, suite, etc." />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Phone <span style={{ color: "#ef4444" }}>*</span></label>
          <input value={form.phone} onChange={set("phone")} style={fi} placeholder="e.g. 07034100652" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>City</label>
          <input value={form.city} onChange={set("city")} style={fi} placeholder="e.g. Yaba" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Display Name <span style={{ color: "#ef4444" }}>*</span></label>
          <input value={form.displayName} onChange={set("displayName")} style={fi} placeholder="e.g. Data Science Nigeria" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Country <span style={{ color: "#ef4444" }}>*</span></label>
          <input value="Nigeria" readOnly style={{ ...fi, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "not-allowed" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>State/Province <span style={{ color: "#ef4444" }}>*</span></label>
          <select value={form.state} onChange={set("state")} style={sel}>
            <option value="">Please select</option>
            {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email</label>
          <input value={form.email} onChange={set("email")} style={{ ...fi, maxWidth: 400 }} placeholder="e.g. info@datasciencenigeria.ai" type="email" />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 16, background: "var(--danger-bg, #FEF2F2)", border: "1px solid var(--accent, #EF4444)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--accent, #EF4444)" }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {onToggleActive && !isFilingOrMailing && (
            <button onClick={onToggleActive} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: isActive ? "#ef4444" : "#22c55e", padding: 0 }}>
              {isActive ? "Deactivate" : "Activate"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={onSave} disabled={saving}
            style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
            {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Save"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
