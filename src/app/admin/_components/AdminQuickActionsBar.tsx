"use client"
import { Plus, Building2, Users, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

interface Props {
  departments: { id: string; name: string }[]
}

export default function AdminQuickActionsBar({ departments: _ }: Props) {
  const router = useRouter()

  const actions: { label: string; icon: React.ElementType; bg: string; color: string; onClick: () => void }[] = [
    {
      label: "Add Employee",
      icon: Plus,
      bg: "var(--primary)",
      color: "white",
      onClick: () => router.push("/admin/people/employees/add"),
    },
    {
      label: "Departments",
      icon: Building2,
      bg: "#EEF2FF",
      color: "#6366F1",
      onClick: () => router.push("/admin/people/departments"),
    },
    {
      label: "All Employees",
      icon: Users,
      bg: "#F0FDF4",
      color: "var(--primary)",
      onClick: () => router.push("/admin/people/employees"),
    },
    {
      label: "Reports",
      icon: FileText,
      bg: "#FFFBEB",
      color: "#D97706",
      onClick: () => router.push("/admin/reports"),
    },
  ]

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
      {actions.map(({ label, icon: Icon, bg, color, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "9px 16px", borderRadius: 9,
            background: bg, color,
            border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700,
            boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.82"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  )
}
