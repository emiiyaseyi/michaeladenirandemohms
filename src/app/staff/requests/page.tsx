"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet, Banknote, CalendarDays, LogOut, ArrowRightLeft, FileText, Inbox } from "lucide-react"

const SECTIONS = [
  {
    id: "salary-advances",
    label: "Salary Advances",
    icon: Wallet,
    columns: ["Policy", "Tenure", "Amount", "Reason", "Status"],
    submitHref: "/staff/requests/salary-advances",
  },
  {
    id: "loans",
    label: "Loans",
    icon: Banknote,
    columns: ["Policy", "Tenure", "Amount", "Reason", "Type", "Status", "Provider", "Provider Status"],
    submitHref: "/staff/requests/loans",
  },
  {
    id: "leave",
    label: "Leave",
    icon: CalendarDays,
    columns: ["Type", "Start Date", "End Date", "Days", "Status"],
    submitHref: "/staff/requests/leave",
  },
  {
    id: "exits",
    label: "Exits",
    icon: LogOut,
    columns: ["Type", "Intended Last Day", "Reason", "Status"],
    submitHref: "/staff/requests/exit",
  },
  {
    id: "redeployments",
    label: "Redeployments",
    icon: ArrowRightLeft,
    columns: ["Policy", "Details", "Redeployment Date", "Reason", "Status"],
    submitHref: "/staff/requests/redeployments",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    columns: ["Policy", "Reason", "Status"],
    submitHref: "/staff/requests/documents",
  },
]

const th: React.CSSProperties = {
  padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em",
  borderBottom: "1px solid var(--border)", background: "var(--card)", whiteSpace: "nowrap",
}

export default function StaffRequestsPage() {
  const router = useRouter()
  const [active, setActive] = useState("salary-advances")
  const section = SECTIONS.find(s => s.id === active)!

  return (
    <div style={{ display: "flex", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", minHeight: 520 }}>

      {/* Left nav */}
      <div style={{ width: 220, borderRight: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ padding: "18px 20px 12px", fontWeight: 800, fontSize: 14, borderBottom: "1px solid var(--border)" }}>
          All Requests
        </div>
        {SECTIONS.map(s => {
          const Icon = s.icon
          const isActive = active === s.id
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "13px 20px", background: "none",
                borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                borderTop: "none", borderRight: "none",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer", textAlign: "left", fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? "var(--primary)" : "var(--foreground)",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none" }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: isActive ? "var(--primary)" : "var(--muted)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={15} color={isActive ? "white" : "var(--muted-foreground)"} />
              </div>
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Right content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{section.label}</span>
          <button
            onClick={() => router.push(section.submitHref)}
            style={{ padding: "8px 18px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
          >
            Submit Request
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {section.columns.map(col => (
                  <th key={col} style={th}>{col}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px", gap: 10 }}>
          <Inbox size={38} style={{ color: "var(--border)" }} />
          <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No data</span>
        </div>
      </div>
    </div>
  )
}
