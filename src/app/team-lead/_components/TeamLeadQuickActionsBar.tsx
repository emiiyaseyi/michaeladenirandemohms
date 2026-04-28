"use client"
import { Users, CalendarDays, TrendingUp, UserCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TeamLeadQuickActionsBar() {
  const router = useRouter()

  const actions: { label: string; icon: React.ElementType; bg: string; color: string; href: string }[] = [
    { label: "My Team", icon: Users, bg: "#F0FDF4", color: "var(--primary)", href: "/team-lead/people/teams" },
    { label: "Leave Requests", icon: CalendarDays, bg: "#FFFBEB", color: "#D97706", href: "/team-lead/requests/leave" },
    { label: "Performance", icon: TrendingUp, bg: "#F5F3FF", color: "#7C3AED", href: "/team-lead/performance" },
    { label: "Self Service", icon: UserCircle, bg: "#EFF6FF", color: "#3B82F6", href: "/team-lead/self-service/profile" },
  ]

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
      {actions.map(({ label, icon: Icon, bg, color, href }) => (
        <button
          key={label}
          onClick={() => router.push(href)}
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
