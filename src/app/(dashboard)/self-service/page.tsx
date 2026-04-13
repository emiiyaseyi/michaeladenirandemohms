"use client"
import Link from "next/link"
import Card from "@/components/ui/Card"
import {
  User, CalendarDays, ShoppingBag, HelpCircle, LogOut, BarChart2,
  ChevronRight, Edit2, FileText, Bell, Settings,
} from "lucide-react"

const services = [
  {
    icon: User,
    label: "My Profile",
    desc: "View and update your personal, contact, bank, and next of kin information",
    href: "/self-service/profile",
    color: "var(--primary)",
    badge: null,
  },
  {
    icon: CalendarDays,
    label: "Leave",
    desc: "Apply for leave, view history, check balances, and manage relief duties",
    href: "/self-service/leave",
    color: "#0891B2",
    badge: null,
  },
  {
    icon: ShoppingBag,
    label: "Requisitions",
    desc: "Request assets, resources, or staff. Leads and managers can raise hiring requisitions",
    href: "/self-service/requisitions",
    color: "#F59E0B",
    badge: "Coming soon",
  },
  {
    icon: HelpCircle,
    label: "Grievance",
    desc: "Raise a workplace grievance or complaint confidentially",
    href: "/self-service/grievance",
    color: "#EF4444",
    badge: "Coming soon",
  },
  {
    icon: LogOut,
    label: "Exit",
    desc: "Initiate a resignation or view your offboarding checklist",
    href: "/self-service/exit",
    color: "#7C3AED",
    badge: "Coming soon",
  },
  {
    icon: BarChart2,
    label: "Surveys",
    desc: "Participate in pulse surveys, engagement checks, and feedback forms",
    href: "/self-service/surveys",
    color: "#10B981",
    badge: "Coming soon",
  },
  {
    icon: FileText,
    label: "Documents",
    desc: "View your documents, signed contracts, and acknowledged policies",
    href: "/documents",
    color: "#6366F1",
    badge: null,
  },
  {
    icon: Settings,
    label: "Preferences",
    desc: "Manage notification preferences, theme, and account settings",
    href: "/self-service/preferences",
    color: "#64748B",
    badge: null,
  },
]

export default function SelfServicePage() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Self Service</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Everything you need to manage your employment in one place.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {services.map(({ icon: Icon, label, desc, href, color, badge }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div
              style={{ height: "100%", cursor: "pointer", transition: "all 0.15s", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
              onMouseEnter={(e: any) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${color}40`; (e.currentTarget as HTMLElement).style.borderColor = `${color}60` }}
              onMouseLeave={(e: any) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "" }}
            >
              <div style={{ padding: "20px 20px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {badge && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)" }}>{badge}</span>
                    )}
                    <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
