"use client"
import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, Upload } from "lucide-react"

type Branding = {
  companyName: string
  logoUrl: string | null
  primaryColor: string
  employeeEmailDomain: string
}

const DEFAULTS: Branding = { companyName: "Michael Demo HRMS", logoUrl: null, primaryColor: "#0B5C2E", employeeEmailDomain: "michaeldemohrms.example" }

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8,
  fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  outline: "none", boxSizing: "border-box",
}

const btn = (variant: "primary" | "muted" = "muted", extra?: React.CSSProperties): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
  fontSize: 13, fontWeight: 600,
  background: variant === "primary" ? "var(--primary)" : "var(--muted)",
  color: variant === "primary" ? "white" : "var(--foreground)",
  ...extra,
})

const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }

export default function BrandingConfigSection() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<Branding>(DEFAULTS)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/settings/branding")
      .then(r => r.json())
      .then(d => { if (d.branding) setSettings(d.branding); setLoading(false) })
  }, [open])

  const update = (patch: Partial<Branding>) => {
    setSettings(s => ({ ...s, ...patch }))
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    setResult(null)
    const r = await fetch("/api/settings/branding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) })
    const d = await r.json()
    setSaving(false)
    if (r.ok) { setDirty(false); setResult({ ok: true }) } else { setResult({ error: d.error ?? "Failed to save" }) }
  }

  const uploadLogo = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("folder", "branding")
    const r = await fetch("/api/upload", { method: "POST", body: fd })
    const d = await r.json()
    setUploading(false)
    if (r.ok && d.url) update({ logoUrl: d.url })
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
        <button onClick={() => setOpen(o => !o)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Branding</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Company name, logo, colors, and employee email format</div>
          </div>
        </button>
        <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}><Loader2 size={20} style={{ animation: "spin .8s linear infinite" }} /></div>
          ) : (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

              <div>
                <label style={label}>Company Name</label>
                <input style={inp} value={settings.companyName} onChange={e => update({ companyName: e.target.value })} placeholder="Michael Demo HRMS" />
              </div>

              <div>
                <label style={label}>Logo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--muted)", flexShrink: 0 }}>
                    <img src={settings.logoUrl || "/logo.svg"} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={btn("muted", { opacity: uploading ? 0.6 : 1 })}>
                    {uploading ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : <Upload size={13} />} Upload Logo
                  </button>
                </div>
              </div>

              <div>
                <label style={label}>Primary Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="color" value={settings.primaryColor} onChange={e => update({ primaryColor: e.target.value })} style={{ width: 44, height: 36, padding: 2, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", background: "var(--background)" }} />
                  <input style={{ ...inp, width: 140 }} value={settings.primaryColor} onChange={e => update({ primaryColor: e.target.value })} placeholder="#0B5C2E" />
                </div>
              </div>

              <div>
                <label style={label}>Employee Email Domain</label>
                <input style={inp} value={settings.employeeEmailDomain} onChange={e => update({ employeeEmailDomain: e.target.value })} placeholder="michaeldemohrms.example" />
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>New employees must use this email domain. Leave blank to allow any email domain.</div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={save} disabled={saving || !dirty} style={btn("primary", { opacity: saving || !dirty ? 0.5 : 1 })}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : null} Save Branding
                </button>
                {result && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: result.ok ? "#16a34a" : "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
                    {result.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {result.ok ? "Saved" : result.error}
                  </span>
                )}
              </div>

            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
