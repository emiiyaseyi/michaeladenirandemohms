"use client"
import { AlertCircle, TrendingUp } from "lucide-react"

interface Props {
  pendingLeave: number
  pendingKPIs: number
}

export default function AlertsBanner({ pendingLeave, pendingKPIs }: Props) {
  if (pendingLeave === 0 && pendingKPIs === 0) return null

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
      {pendingLeave > 0 && (
        <div style={{ flex: 1, minWidth: 240, background: "var(--warning-bg)", border: "1px solid #FDE68A", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertCircle size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>
              {pendingLeave} Leave Request{pendingLeave !== 1 ? "s" : ""} Awaiting
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Requires your approval</div>
          </div>
        </div>
      )}
      {pendingKPIs > 0 && (
        <div style={{ flex: 1, minWidth: 240, background: "var(--info-bg)", border: "1px solid #BAE6FD", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <TrendingUp size={18} style={{ color: "var(--info)", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>
              {pendingKPIs} KPI{pendingKPIs !== 1 ? "s" : ""} Pending Review
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Performance cycle active</div>
          </div>
        </div>
      )}
    </div>
  )
}
