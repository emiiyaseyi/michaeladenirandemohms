"use client"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"

type DataPoint = { label: string; inCompany: number; exited: number }

// Green for active employees (in company), red for exited/attrition.
const GREEN = "#0B5C2E"
const RED   = "#DC2626"

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, background: p.fill, flexShrink: 0, borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AttritionTrendChart({ data }: { data: DataPoint[] }) {
  // Derive the axis ceiling from the data (stacked total per point) instead of a
  // fixed 60 - a headcount that grows past that would otherwise clip silently.
  const maxStacked = Math.max(0, ...data.map(d => (d.inCompany ?? 0) + (d.exited ?? 0)))
  const step = Math.max(10, Math.ceil((maxStacked || 60) / 6 / 10) * 10)
  const yMax = step * 6
  const yTicks = Array.from({ length: 7 }, (_, i) => i * step)

  return (
    <div style={{
      background: "var(--card)", borderRadius: 16, padding: "24px 20px 20px",
      border: "1px solid var(--border)", boxShadow: "var(--shadow)", flex: 1, minWidth: 0,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
          Employee Attrition-Trend
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, background: RED, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No. of exited employees in the month</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, background: GREEN, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No. of employees in the Company</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} maxBarSize={48}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false} tickLine={false}
            interval={0}
          />
          <YAxis
            ticks={yTicks}
            domain={[0, yMax]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false} tickLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="inCompany" stackId="a" fill={GREEN} radius={[0, 0, 0, 0]} />
          <Bar dataKey="exited"    stackId="a" fill={RED}   radius={[0, 0, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
