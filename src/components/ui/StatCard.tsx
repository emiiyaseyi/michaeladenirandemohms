import { LucideIcon } from "lucide-react"

export default function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: LucideIcon; color?: string; sub?: string }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color ? `${color}18` : "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} style={{ color: color ?? "var(--primary)" }} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  )
}
