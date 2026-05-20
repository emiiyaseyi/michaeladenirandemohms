"use client"
import { useState, useEffect } from "react"
import { ClipboardList, Save, Loader2 } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function hourLabel(h: number) {
  const n = h === 24 ? 0 : h
  return `${String(n).padStart(2, "0")}:00`
}

const DEFAULT_CRITERIA = [
  { score: 3, description: "Present all 3 required days with NO lateness" },
  { score: 2, description: "Present 3 days, late but with Admin/HR notification" },
  { score: 1, description: "Present 2 days out of 3, with lateness and no notification" },
  { score: 0, description: "Absent and/or late all week with no notification" },
]

export default function InternReportSettingsPage() {
  const [settings, setSettings] = useState<{
    submissionDay: number
    openHour: number
    lateHour: number
    closeHour: number
    lateDeduction: number
    lateDeductionSunday: number
    warningThresholdMinutes: number
    attendanceCriteria: { score: number; description: string }[]
  }>({
    submissionDay: 5,
    openHour: 16,
    lateHour: 20,
    closeHour: 24,
    lateDeduction: 2,
    lateDeductionSunday: 3,
    warningThresholdMinutes: 15,
    attendanceCriteria: DEFAULT_CRITERIA,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

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
          lateDeductionSunday: d.lateDeductionSunday ?? 3,
          warningThresholdMinutes: d.warningThresholdMinutes ?? 15,
          attendanceCriteria: d.attendanceCriteria ?? DEFAULT_CRITERIA,
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

  const lockedRow = (label: string, sublabel: string, value: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{sublabel}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{value}</span>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--muted)", color: "var(--muted-foreground)", fontWeight: 600 }}>Locked</span>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 960, padding: "32px 0" }}>
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
          {/* Locked policy: submission day is Friday; window closes Sunday 11:59 PM WAT. Only the on-Friday hours are configurable. */}
          <div style={{ padding: "12px 14px", background: "#F3F4F6", borderRadius: 8, fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--foreground)" }}>Fixed policy:</strong> submissions open on <strong>Friday</strong> and the full window stays open through <strong>Sunday 11:59 PM WAT</strong>. Saturday submissions incur the Saturday deduction; Sunday submissions incur the Sunday deduction; non-submission by Monday becomes a MISSING record. Only the deduction amounts and warning threshold below are admin-configurable.
          </div>
          {lockedRow("Window Opens (Friday start time)", "Fixed — cannot be changed", "16:00 WAT")}
          {lockedRow("Late Threshold (Friday — submissions after this time are LATE)", "Fixed — cannot be changed", "20:00 WAT")}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Saturday Deduction</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Points deducted for submissions made on Saturday</div>
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Sunday Deduction</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Points deducted for submissions made on Sunday (final day of window)</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number" min={0} max={10} step={1}
                value={settings.lateDeductionSunday}
                onChange={e => set("lateDeductionSunday", Number(e.target.value))}
                style={{ width: 80, padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>pts</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Warning Threshold</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Minutes before the late threshold when the countdown turns red as a warning</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number" min={0} max={120} step={1}
                value={settings.warningThresholdMinutes}
                onChange={e => set("warningThresholdMinutes", Number(e.target.value))}
                style={{ width: 80, padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>min</span>
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 16px", marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview — current window</div>
            <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.8 }}>
              Window opens <strong>{DAYS[settings.submissionDay]} {hourLabel(settings.openHour)} WAT</strong> and stays open through <strong>Sunday 11:59 PM WAT</strong>.
              <br />
              • <strong>{DAYS[settings.submissionDay]} {hourLabel(settings.openHour)}–{hourLabel(settings.lateHour)}:</strong> on time — 0 pts
              <br />
              • <strong>{DAYS[settings.submissionDay]} {hourLabel(settings.lateHour)}–midnight:</strong> LATE flag, 0 pts
              <br />
              • <strong>Saturday:</strong> LATE, <strong>−{settings.lateDeduction} pts</strong>
              <br />
              • <strong>Sunday:</strong> LATE, <strong>−{settings.lateDeductionSunday} pts</strong>
              <br />
              • <strong>Monday onwards:</strong> window closed. No submission row → auto-created as <strong>MISSING (−{settings.lateDeductionSunday} pts)</strong> by Monday cron.
              <br />
              Countdown turns red <strong>{settings.warningThresholdMinutes} minutes</strong> before the late threshold.
            </div>
          </div>

          {/* Attendance Criteria */}
          <div style={{ paddingTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Attendance Rating Criteria</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
              These scores (0–3) are used when an admin fills attendance for an intern's weekly report. Each score maps to a specific attendance level.
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", background: "var(--muted)", padding: "8px 14px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Score</span>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Description</span>
              </div>
              {settings.attendanceCriteria.map((c, i) => (
                <div key={c.score} style={{ display: "grid", gridTemplateColumns: "60px 1fr", padding: "10px 14px", borderTop: "1px solid var(--border)", gap: 12, alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: "var(--primary)", textAlign: "center" }}>{c.score}</span>
                  <input
                    type="text"
                    value={c.description}
                    onChange={e => {
                      const updated = settings.attendanceCriteria.map((x, j) => j === i ? { ...x, description: e.target.value } : x)
                      setSettings(s => ({ ...s, attendanceCriteria: updated }))
                    }}
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {err && <div style={{ marginTop: 12, fontSize: 13, color: "#DC2626", background: "#FEE2E2", borderRadius: 8, padding: "8px 12px" }}>{err}</div>}

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setConfirmOpen(true)}
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

      {confirmOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setConfirmOpen(false)}>
          <div style={{ background: "var(--card)", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>Update Intern Report Settings?</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 24px", lineHeight: 1.6 }}>
              This will change the submission window and criteria for all interns immediately.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setConfirmOpen(false)} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--background)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { setConfirmOpen(false); save() }} style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, Update</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
