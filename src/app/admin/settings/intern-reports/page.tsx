"use client"
import { useState, useEffect } from "react"
import { ClipboardList, Save, Loader2 } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function hourLabel(h: number) {
  if (h === 0 || h === 24) return "12:00 AM"
  if (h === 12) return "12:00 PM"
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => ({ value: i, label: `${hourLabel(i)} WAT` }))

export default function InternReportSettingsPage() {
  const [settings, setSettings] = useState({
    submissionDay: 5,
    openHour: 16,
    lateHour: 20,
    closeHour: 24,
    lateDeduction: 2,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState("")

  useEffect(() => {
    fetch("/api/settings/intern-reports")
      .then(r => r.json())
      .then(d => {
        setSettings({
          submissionDay: d.submissionDay ?? 5,
          openHour: d.openHour ?? 16,
          lateHour: d.lateHour ?? 20,
          closeHour: d.closeHour ?? 24,
          lateDeduction: d.lateDeduction ?? 2,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: string, val: number) => setSettings(s => ({ ...s, [key]: val }))

  const save = async () => {
    setSaving(true); setErr(""); setSaved(false)
    const res = await fetch("/api/settings/intern-reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    if (!res.ok) { setErr("Failed to save settings"); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const row = (label: string, key: string, options: { value: number; label: string }[]) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      </div>
      <select
        value={(settings as any)[key]}
        onChange={e => set(key, Number(e.target.value))}
        style={{ padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", minWidth: 180 }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{ maxWidth: 700, padding: "32px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <ClipboardList size={20} style={{ color: "var(--primary)" }} />
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Intern Report Settings</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 2 }}>
            Configure when interns can submit their weekly reports.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", padding: 24 }}>
          <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
        </div>
      ) : (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "8px 24px 20px" }}>
          {row("Submission Day", "submissionDay", DAYS.map((d, i) => ({ value: i, label: d })))}
          {row("Window Opens (exact start time)", "openHour", HOUR_OPTIONS.slice(0, 24))}
          {row("Late Threshold (submissions after this time are late)", "lateHour", HOUR_OPTIONS.slice(0, 24))}
          {row("Window Closes (no submissions after this time)", "closeHour", HOUR_OPTIONS.slice(1))}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Late Submission Deduction</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Points deducted for late submissions</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number" min={0} max={10} step={1}
                value={settings.lateDeduction}
                onChange={e => set("lateDeduction", Number(e.target.value))}
                style={{ width: 80, padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>pts</span>
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 16px", marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</div>
            <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.8 }}>
              Interns can submit every <strong>{DAYS[settings.submissionDay]}</strong> between{" "}
              <strong>{hourLabel(settings.openHour)} WAT</strong> and{" "}
              <strong>{settings.closeHour === 24 ? "midnight" : hourLabel(settings.closeHour)} WAT</strong>.
              <br />
              Submissions after <strong>{hourLabel(settings.lateHour)} WAT</strong> are marked <em>late</em> and incur a{" "}
              <strong>{settings.lateDeduction}-point deduction</strong>.
            </div>
          </div>

          {err && <div style={{ marginTop: 12, fontSize: 13, color: "#DC2626", background: "#FEE2E2", borderRadius: 8, padding: "8px 12px" }}>{err}</div>}

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 24px", background: saved ? "#16a34a" : "var(--primary)", color: "white",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1, transition: "background .2s",
              }}
            >
              {saving ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Save size={14} />}
              {saved ? "Saved!" : saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
