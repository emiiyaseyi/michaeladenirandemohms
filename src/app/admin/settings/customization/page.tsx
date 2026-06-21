"use client"
import EmailConfigSection from "@/components/settings/EmailConfigSection"

export default function CustomizationSettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <EmailConfigSection />
    </div>
  )
}
