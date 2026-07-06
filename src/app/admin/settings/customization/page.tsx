"use client"
import EmailConfigSection from "@/components/settings/EmailConfigSection"
import BrandingConfigSection from "@/components/settings/BrandingConfigSection"

export default function CustomizationSettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <BrandingConfigSection />
      <EmailConfigSection />
    </div>
  )
}
