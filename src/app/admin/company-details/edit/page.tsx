"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Upload, X, ArrowLeft } from "lucide-react"

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none",
}

export default function EditCompanyDetailsPage() {
  const router = useRouter()
  const [form, setForm] = useState({ companyName: "", email: "", primaryContact: "", otherContact: "", logoUrl: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/company-details")
      .then(r => r.json())
      .then(d => {
        const det = d.details ?? {}
        setForm({
          companyName: det.companyName ?? "",
          email: det.email ?? "",
          primaryContact: det.primaryContact ?? "",
          otherContact: det.otherContact ?? "",
          logoUrl: det.logoUrl ?? "",
        })
        setLoading(false)
      })
  }, [])

  const save = async () => {
    if (!form.companyName.trim()) { setError("Company name is required"); return }
    setSaving(true); setError("")
    const r = await fetch("/api/company-details", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to save"); return }
    router.push("/admin/company-details")
  }

  const uploadLogo = async (file: File) => {
    setLogoUploading(true)
    const fd = new FormData(); fd.append("file", file); fd.append("folder", "org-docs")
    const r = await fetch("/api/upload", { method: "POST", body: fd })
    const d = await r.json()
    setLogoUploading(false)
    if (d.url) setForm(f => ({ ...f, logoUrl: d.url }))
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <button onClick={() => router.push("/admin/company-details")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: "0 0 16px", fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to Company Details
      </button>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>Edit Company Details</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Company name appears in reports and accounting integrations.</p>
        </div>

        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Company image</label>
            <label style={{
              width: 160, height: 160, border: "2px dashed var(--border)", borderRadius: 10,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, cursor: "pointer", background: "var(--muted)", overflow: "hidden", position: "relative",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
              ) : logoUploading ? (
                <Loader2 size={20} style={{ animation: "spin .8s linear infinite", color: "var(--muted-foreground)" }} />
              ) : (
                <>
                  <div style={{ fontSize: 28, color: "var(--muted-foreground)", lineHeight: 1 }}>+</div>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>Upload</span>
                </>
              )}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={logoUploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = "" }} />
            </label>
            {form.logoUrl && (
              <button onClick={() => setForm(f => ({ ...f, logoUrl: "" }))}
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, width: "fit-content" }}>
                <X size={11} /> Remove logo
              </button>
            )}
          </div>

          {/* Right fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Company name <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} style={fi} placeholder="e.g. Data Science Nigeria" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Email address <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={fi} placeholder="info@company.com" type="email" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Other contact
              </label>
              <input value={form.otherContact} onChange={e => setForm(f => ({ ...f, otherContact: e.target.value }))} style={fi} placeholder="Optional secondary number" />
            </div>
          </div>

          {/* Primary contact — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Primary contact <span style={{ color: "var(--accent)" }}>*</span>
            </label>
            <input value={form.primaryContact} onChange={e => setForm(f => ({ ...f, primaryContact: e.target.value }))} style={{ ...fi, maxWidth: 400 }} placeholder="08100000000" />
          </div>
        </div>

        {error && (
          <div style={{ margin: "0 24px 16px", background: "var(--danger-bg)", border: "1px solid var(--accent)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--accent)" }}>
            {error}
          </div>
        )}

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => router.push("/admin/company-details")}
            style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
            {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Save"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
