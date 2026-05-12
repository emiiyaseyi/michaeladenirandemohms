import SettingsNav from "./_components/SettingsNav"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <SettingsNav />
      <div style={{ paddingTop: 20 }}>
        {children}
      </div>
    </div>
  )
}
