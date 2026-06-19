"use client"
import { useState, useEffect } from "react"
import { Loader2, Save, Bell, Settings, Briefcase, Users } from "lucide-react"

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, borderRadius: 12, background: checked ? "var(--primary)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  )
}

function Section({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} style={{ color: "var(--muted-foreground)" }} />
        </div>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>{title}</h3>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{description}</p>
        </div>
      </div>
      <div style={{ padding: "8px 0" }}>{children}</div>
    </div>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderBottom: "1px solid var(--border)", gap: 24 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600 }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3 }}>{description}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

type Settings = {
  recruitment_notify_new_application: boolean
  recruitment_notify_stage_change: boolean
  recruitment_notify_hired: boolean
  recruitment_notify_rejected: boolean
  recruitment_auto_close_days: number
  recruitment_default_employment_type: string
  recruitment_require_cover_letter: boolean
  recruitment_allow_internal_applications: boolean
}

const DEFAULTS: Settings = {
  recruitment_notify_new_application: true,
  recruitment_notify_stage_change: true,
  recruitment_notify_hired: true,
  recruitment_notify_rejected: false,
  recruitment_auto_close_days: 30,
  recruitment_default_employment_type: "FULL_TIME",
  recruitment_require_cover_letter: false,
  recruitment_allow_internal_applications: true,
}

export default function RecruitmentSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/recruitment/settings")
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings({ ...DEFAULTS, ...d.settings })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(s => ({ ...s, [key]: value }))
    setSaved(false)
  }

  const doSave = async () => {
    setSaving(true)
    await fetch("/api/recruitment/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Recruitment Settings</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>Configure your hiring pipeline, notifications, and defaults.</p>
        </div>
        <button onClick={doSave} disabled={saving}
          style={{ padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
          {saving ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : <Save size={13} />}
          {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <Section icon={Bell} title="Email Notifications" description="Choose which events trigger email notifications.">
        <SettingRow label="New application received" description="Notify recruiters when a candidate submits an application.">
          <Toggle checked={settings.recruitment_notify_new_application} onChange={v => set("recruitment_notify_new_application", v)} />
        </SettingRow>
        <SettingRow label="Application stage changed" description="Notify candidates when they are moved to a new pipeline stage.">
          <Toggle checked={settings.recruitment_notify_stage_change} onChange={v => set("recruitment_notify_stage_change", v)} />
        </SettingRow>
        <SettingRow label="Candidate hired" description="Notify HR when an applicant's status is set to Hired.">
          <Toggle checked={settings.recruitment_notify_hired} onChange={v => set("recruitment_notify_hired", v)} />
        </SettingRow>
        <SettingRow label="Application rejected" description="Notify candidates when their application is rejected.">
          <Toggle checked={settings.recruitment_notify_rejected} onChange={v => set("recruitment_notify_rejected", v)} />
        </SettingRow>
      </Section>

      <Section icon={Briefcase} title="Pipeline Configuration" description="Set defaults for job postings and the hiring pipeline.">
        <SettingRow label="Default employment type" description="Pre-selected employment type when creating a new job posting.">
          <select value={settings.recruitment_default_employment_type} onChange={e => set("recruitment_default_employment_type", e.target.value)}
            style={{ ...fi, width: "auto", minWidth: 160, appearance: "none" }}>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERN">Intern</option>
          </select>
        </SettingRow>
        <SettingRow label="Auto-close jobs after (days)" description="Automatically close a job posting after this many days. Set to 0 to disable.">
          <input type="number" min={0} max={365} value={settings.recruitment_auto_close_days}
            onChange={e => set("recruitment_auto_close_days", Math.max(0, parseInt(e.target.value) || 0))}
            style={{ ...fi, width: 80, textAlign: "center" }} />
        </SettingRow>
      </Section>

      <Section icon={Users} title="Application Requirements" description="Control what candidates must provide when applying.">
        <SettingRow label="Require cover letter" description="Candidates must include a cover letter to complete their application.">
          <Toggle checked={settings.recruitment_require_cover_letter} onChange={v => set("recruitment_require_cover_letter", v)} />
        </SettingRow>
        <SettingRow label="Allow internal applications" description="Current employees can apply for internal job postings.">
          <Toggle checked={settings.recruitment_allow_internal_applications} onChange={v => set("recruitment_allow_internal_applications", v)} />
        </SettingRow>
      </Section>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Settings size={16} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Hiring Pipeline Stages</h3>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>The default stages all applicants move through.</p>
          </div>
        </div>
        <div style={{ padding: "16px 24px", display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "Application", color: "#2563EB", bg: "#EFF6FF" },
            { label: "Assessment",  color: "#C2410C", bg: "#FFF7ED" },
            { label: "Technical",   color: "#7C3AED", bg: "#F5F3FF" },
            { label: "Interview",   color: "#059669", bg: "#ECFDF5" },
            { label: "Mgmt Review", color: "#854D0E", bg: "#FEF9C3" },
            { label: "Offer",       color: "#15803D", bg: "#F0FDF4" },
            { label: "Onboarding",  color: "#15803D", bg: "#DCFCE7" },
          ].map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
              {i < 6 && <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>→</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Pipeline stages are fixed. Contact your administrator to modify the hiring workflow.</p>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
