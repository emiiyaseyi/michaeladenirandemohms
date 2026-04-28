"use client"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"

type DataPoint = {
  label: string
  totalPayroll: number
  disbursed: number
}

const DISBURSED_COLOR = "#93B8FB"
const TOTAL_COLOR     = "#004AF5"

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    }}>
      <div style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "var(--muted-foreground)" }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: "var(--foreground)" }}>₦{p.value.toFixed(2)}M</span>
        </div>
      ))}
    </div>
  )
}

export default function PayrollHistoryChart({ data }: { data: DataPoint[] }) {
  const yTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

  return (
    <div style={{
      background: "var(--card)", borderRadius: 16, padding: "24px 24px 20px",
      border: "1px solid var(--border)", boxShadow: "var(--shadow)",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 10 }}>
          Recent Payroll History
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: DISBURSED_COLOR, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Disbursed Payment</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: TOTAL_COLOR, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Total Payroll</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradDisbursed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={DISBURSED_COLOR} stopOpacity={0.25} />
              <stop offset="95%" stopColor={DISBURSED_COLOR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={TOTAL_COLOR} stopOpacity={0.2} />
              <stop offset="95%" stopColor={TOTAL_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            ticks={yTicks}
            domain={[0, 1.0]}
            tickFormatter={v => v.toFixed(1)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false} tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone" dataKey="disbursed" name="Disbursed Payment"
            stroke={DISBURSED_COLOR} strokeWidth={2}
            fill="url(#gradDisbursed)" dot={{ r: 3, fill: DISBURSED_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone" dataKey="totalPayroll" name="Total Payroll"
            stroke={TOTAL_COLOR} strokeWidth={2}
            fill="url(#gradTotal)" dot={{ r: 3, fill: TOTAL_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
