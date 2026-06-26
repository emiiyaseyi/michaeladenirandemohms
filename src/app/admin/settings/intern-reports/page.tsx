"use client"
import { useState, useEffect } from "react"
import { ClipboardList, Save, Loader2 } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const OPENABLE_DAYS = [1, 2, 3, 4, 5] // Monday–Friday only - weekends are always the late-deduction days

function hourLabel(h: number) {
  const n = h === 24 ? 0 : h
  return `${String(n).padStart(2, "0")}:00`
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

// Offset (in days) from this calendar week's Monday for a given day-of-week index (0=Sun..6=Sat)
function offsetFromMonday(dow: number) {
  return (dow + 6) % 7
}

function fmtHHMM(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function parseHHMM(s: string): { h: number; m: number } | null {
  const match = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const h = parseInt(match[1], 10), m = parseInt(match[2], 10)
  if (h > 23 || m > 59) return null
  return { h, m }
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
    openHour: number; openMinute: number
    lateHour: number; lateMinute: number
    closeHour: number
    lateDeductionSameDay: number
    lateDeduction: number
    lateDeductionSunday: number
    missingWeeklyDeduction: number
    warningThresholdMinutes: number
    attendanceCriteria: { score: number; description: string }[]
  }>({
    submissionDay: 5,
    openHour: 16, openMinute: 0,
    lateHour: 20, lateMinute: 0,
    closeHour: 24,
    lateDeductionSameDay: 1,
    lateDeduction: 2,
    lateDeductionSunday: 3,
    missingWeeklyDeduction: 10,
    warningThresholdMinutes: 15,
    attendanceCriteria: DEFAULT_CRITERIA,
  })
  const [openTimeStr, setOpenTimeStr] = useState("16:00")
  const [lateTimeStr, setLateTimeStr] = useState("20:00")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    fetch("/api/settings/intern-reports")
      .then(r => r.json())
      .then(d => {
        const oh = d.openHour ?? 16, om = d.openMinute ?? 0
        const lh = d.lateHour ?? 20, lm = d.lateMinute ?? 0
        setOpenTimeStr(fmtHHMM(oh, om))
        setLateTimeStr(fmtHHMM(lh, lm))
        setSettings({
          submissionDay: d.submissionDay ?? 5,
          openHour: oh, openMinute: om,
          lateHour: lh, lateMinute: lm,
          closeHour: d.closeHour ?? 24,
          lateDeductionSameDay: d.lateDeductionSameDay ?? 1,
          lateDeduction: d.lateDeduction ?? 2,
          lateDeductionSunday: d.lateDeductionSunday ?? 3,
          missingWeeklyDeduction: d.missingWeeklyDeduction ?? 10,
          warningThresholdMinutes: d.warningThresholdMinutes ?? 15,
          attendanceCriteria: d.attendanceCriteria ?? DEFAULT_CRITERIA,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: string, val: number) => setSettings(s => ({ ...s, [key]: val }))

  const save = async () => {
    const openParsed = parseHHMM(openTimeStr)
    const lateParsed = parseHHMM(lateTimeStr)
    if (!openParsed) { setErr("Invalid open time - use HH:MM (e.g. 16:00)"); return }
    if (!lateParsed) { setErr("Invalid late threshold - use HH:MM (e.g. 20:00)"); return }
    const payload = {
      ...settings,
      openHour: openParsed.h, openMinute: openParsed.m,
      lateHour: lateParsed.h, lateMinute: lateParsed.m,
    }
    setSaving(true); setErr(""); setSaved(false)
    const res = await fetch("/api/settings/intern-reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) { setErr("Failed to save settings"); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          <div style={{ padding: "12px 14px", background: "#F3F4F6", borderRadius: 8, fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12, lineHeight: 1.6 }}>
            The submission window opens on the chosen day. Saturday and Sunday are always the late-deduction days, no matter which day the window opens on. Still not submitted by Monday - it becomes a MISSING record and loses more points every following Monday until submitted.
          </div>

          {/* Submission Day */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Submission Day</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Day of the week when the submission window opens (Saturday/Sunday are reserved for late deductions, so they're not selectable here)</div>
            </div>
            <select
              value={settings.submissionDay}
              onChange={e => set("submissionDay", Number(e.target.value))}
              style={{ padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", minWidth: 140 }}
            >
              {OPENABLE_DAYS.map(i => <option key={i} value={i}>{DAYS[i]}</option>)}
            </select>
          </div>

          {/* Open Hour */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Window Opens At</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>WAT time when interns can start submitting (e.g. 16:00, 13:30)</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="text"
                value={openTimeStr}
                onChange={e => setOpenTimeStr(e.target.value)}
                placeholder="HH:MM"
                style={{ width: 90, padding: "8px 12px", border: `1.5px solid ${parseHHMM(openTimeStr) ? "var(--border)" : "#FCA5A5"}`, borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>WAT</span>
            </div>
          </div>

          {/* Late Hour */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Late Threshold</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Submissions after this WAT time on the submission day are flagged LATE (e.g. 20:00)</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="text"
                value={lateTimeStr}
                onChange={e => setLateTimeStr(e.target.value)}
                placeholder="HH:MM"
                style={{ width: 90, padding: "8px 12px", border: `1.5px solid ${parseHHMM(lateTimeStr) ? "var(--border)" : "#FCA5A5"}`, borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>WAT</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Same-Day Late Deduction</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Points deducted for submissions made after the late threshold but still on the submission day</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number" min={0} max={10} step={1}
                value={settings.lateDeductionSameDay}
                onChange={e => set("lateDeductionSameDay", Number(e.target.value))}
                style={{ width: 80, padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>pts</span>
            </div>
          </div>

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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Missing Report Deduction</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Points deducted on Monday if still not submitted - and again every following Monday until it is</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number" min={0} max={50} step={1}
                value={settings.missingWeeklyDeduction}
                onChange={e => set("missingWeeklyDeduction", Number(e.target.value))}
                style={{ width: 80, padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>pts / week</span>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview - this week's window</div>
            <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.8 }}>
              {(() => {
                const today = new Date()
                const dow = today.getDay()
                const diffToMonday = dow === 0 ? -6 : 1 - dow
                const thisMonday = new Date(today)
                thisMonday.setDate(today.getDate() + diffToMonday)
                thisMonday.setHours(0, 0, 0, 0)

                const addDays = (n: number) => { const d = new Date(thisMonday); d.setDate(thisMonday.getDate() + n); return d }
                const openDate = addDays(offsetFromMonday(settings.submissionDay))
                const satDate = addDays(5)
                const sunDate = addDays(6)
                const missingMonday = addDays(7)

                const d1 = DAYS[settings.submissionDay]
                return <>
                  Window opens <strong>{d1} {fmtDate(openDate)}, {hourLabel(settings.openHour)} WAT</strong>.
                  <br />
                  • <strong>{d1} {hourLabel(settings.openHour)}–{hourLabel(settings.lateHour)}:</strong> on time - 0 pts
                  <br />
                  • <strong>{d1} {hourLabel(settings.lateHour)}–midnight:</strong> LATE flag, <strong>−{settings.lateDeductionSameDay} pts</strong>
                  <br />
                  {settings.submissionDay < 5 && <>
                    • <strong>{DAYS[settings.submissionDay + 1]}–Friday:</strong> window closed - no submission allowed until Saturday's late window opens
                    <br />
                  </>}
                  • <strong>Saturday {fmtDate(satDate)}:</strong> LATE, <strong>−{settings.lateDeduction} pts</strong>
                  <br />
                  • <strong>Sunday {fmtDate(sunDate)}:</strong> LATE, <strong>−{settings.lateDeductionSunday} pts</strong>
                  <br />
                  • <strong>Monday {fmtDate(missingMonday)} onwards:</strong> still not submitted → <strong>MISSING (−{settings.missingWeeklyDeduction} pts)</strong>, and another <strong>−{settings.missingWeeklyDeduction} pts</strong> every following Monday until submitted.
                  <br />
                  Countdown turns red <strong>{settings.warningThresholdMinutes} minutes</strong> before the late threshold.
                  <br />
                  <span style={{ color: "var(--muted-foreground)" }}>Saturday and Sunday are always the late days, and Monday is always the missing-deduction day - changing "Submission Day" above only moves when the window opens, not these.</span>
                </>
              })()}
            </div>
          </div>

          {/* Reviewer Deadline */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Reviewer Deadline</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                Fixed at 7 days after the week starts, at 08:00 WAT - the exact moment the weekly cron runs.
                This isn't adjustable: the cron only runs once a week, so any other time would silently never fire.
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
              Monday · 08:00 WAT
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
