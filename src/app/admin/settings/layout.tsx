import { requireAdminPermission } from "@/lib/server-auth"
import SettingsNav from "./_components/SettingsNav"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPermission("canManageSettings")
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <SettingsNav />
      <div style={{ paddingTop: 20 }}>
        {children}
      </div>
    </div>
  )
}
