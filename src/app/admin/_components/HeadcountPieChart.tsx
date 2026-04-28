"use client"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

type Props = { total: number; male: number; female: number }

const MALE_COLOR   = "#004AF5"
const FEMALE_COLOR = "#F9A8C9"

export default function HeadcountPieChart({ total, male, female }: Props) {
  const data = [
    { name: "Male",   value: male   || 0 },
    { name: "Female", value: female || 0 },
  ]

  const COLORS = [MALE_COLOR, FEMALE_COLOR]

  return (
    <div style={{
      background: "var(--card)", borderRadius: 16, padding: "24px 20px 20px",
      border: "1px solid var(--border)", boxShadow: "var(--shadow)",
      width: 260, flexShrink: 0,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 16, alignSelf: "flex-start" }}>
        Headcount
      </div>

      {/* Donut with center label */}
      <div style={{ position: "relative", width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={58} outerRadius={84}
              dataKey="value"
              startAngle={90} endAngle={-270}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>
            Total<br />Employees
          </span>
          <span style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2, marginTop: 2 }}>
            {total}
          </span>
        </div>
      </div>

      {/* Legend below chart */}
      <div style={{ display: "flex", gap: 20, marginTop: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: MALE_COLOR, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Male</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>({male})</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: FEMALE_COLOR, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Female</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>({female})</span>
        </div>
      </div>
    </div>
  )
}
