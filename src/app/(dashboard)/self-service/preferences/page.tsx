"use client"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import { useTheme } from "@/components/ThemeProvider"
import { Sun, Moon, Bell, Mail, Shield, Smartphone, Save } from "lucide-react"
import { useState } from "react"

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme()
  const [saved, setSaved] = useState(false)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifInApp, setNotifInApp] = useState(true)
  const [notifLeave, setNotifLeave] = useState(true)
  const [notifSystem, setNotifSystem] = useState(false)

  const save = () => {
    // In a real app: PATCH /api/preferences
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid var(--border)" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={14} color="white" />
      </div>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
    </div>
  )

  const Toggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
          background: checked ? "var(--primary)" : "var(--border)",
          position: "relative", transition: "background 0.2s", flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "white",
          position: "absolute", top: 3, left: checked ? 23 : 3, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Preferences</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Manage your account settings and notification preferences</p>
        </div>
        <Button onClick={save} size="sm">
          <Save size={13} /> {saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {/* Appearance */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle icon={Sun} title="Appearance" />
          <div style={{ display: "flex", gap: 12 }}>
            {([["light", "Light", Sun], ["dark", "Dark", Moon]] as const).map(([val, label, Icon]) => (
              <button
                key={val}
                onClick={() => setTheme(val)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  padding: "16px 12px", borderRadius: 12, cursor: "pointer",
                  border: `2px solid ${theme === val ? "var(--primary)" : "var(--border)"}`,
                  background: theme === val ? "var(--primary-50, #EFF6FF)" : "var(--card)",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: theme === val ? "var(--primary)" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} style={{ color: theme === val ? "white" : "var(--muted-foreground)" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme === val ? "var(--primary)" : "var(--foreground)" }}>{label}</span>
                {theme === val && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle icon={Bell} title="Notifications" />
          <Toggle checked={notifInApp} onChange={setNotifInApp} label="In-app notifications" desc="Show notifications in the notification bell" />
          <Toggle checked={notifEmail} onChange={setNotifEmail} label="Email notifications" desc="Receive important updates via your work email" />
          <Toggle checked={notifLeave} onChange={setNotifLeave} label="Leave request updates" desc="Get notified about leave approvals, rejections, and relief requests" />
          <Toggle checked={notifSystem} onChange={setNotifSystem} label="System announcements" desc="Receive system-wide announcements via email" />
        </div>
      </Card>

      {/* Security */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle icon={Shield} title="Security" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Change Password</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Update your login password</div>
            </div>
            <Button variant="secondary" size="sm">Change</Button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Add an extra layer of security</div>
            </div>
            <Button variant="secondary" size="sm">Set up</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
