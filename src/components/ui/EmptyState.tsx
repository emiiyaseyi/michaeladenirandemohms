import { LucideIcon } from "lucide-react"

export default function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon size={24} style={{ color: "var(--subtle)" }} />
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>{title}</h3>
      {description && <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 320, margin: "0 auto 16px" }}>{description}</p>}
      {action}
    </div>
  )
}
