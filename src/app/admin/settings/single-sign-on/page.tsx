"use client"
import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

function Section({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>{description}</div>
        </div>
        {open ? <ChevronUp size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "24px", color: "var(--muted-foreground)", fontSize: 13 }}>
          Configuration options coming soon.
        </div>
      )}
    </div>
  )
}

export default function SingleSignOnSettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Section title="SSO Configuration" description="Connect an identity provider (Google Workspace, Okta, Azure AD) to enable single sign-on for your team." />
      <Section title="Provisioning" description="Automatically create or deactivate accounts when employees are onboarded or offboarded via your identity provider." />
    </div>
  )
}
