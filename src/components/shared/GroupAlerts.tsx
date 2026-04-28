"use client"
import { AlertCircle, TrendingUp } from "lucide-react"

interface Props {
  pendingLeave: number
  kpisToScore: number
  groupLabel?: string
}

export default function GroupAlerts({ pendingLeave, kpisToScore, groupLabel = "Team" }: Props) {
  if (pendingLeave === 0 && kpisToScore === 0) return null

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
      {pendingLeave > 0 && (
        <div style={{ flex: 1, minWidth: 220, background: "var(--warning-bg)", border: "1px solid #FDE68A", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertCircle size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>
              {pendingLeave} {groupLabel} Leave Request{pendingLeave !== 1 ? "s" : ""} Awaiting
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Requires your approval</div>
          </div>
        </div>
      )}
      {kpisToScore > 0 && (
        <div style={{ flex: 1, minWidth: 220, background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <TrendingUp size={18} style={{ color: "#7C3AED", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>
              {kpisToScore} KPI{kpisToScore !== 1 ? "s" : ""} Awaiting Your Score
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{groupLabel} performance submissions</div>
          </div>
        </div>
      )}
    </div>
  )
}
