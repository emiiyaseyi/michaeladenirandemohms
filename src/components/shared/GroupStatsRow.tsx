"use client"
import StatCard from "@/components/ui/StatCard"
import { Users, UserCheck, CalendarDays, Clock, TrendingUp } from "lucide-react"

interface Props {
  groupSize: number
  active: number
  onLeave: number
  pendingLeave: number
  kpisToScore: number
  groupLabel?: string
}

export default function GroupStatsRow({ groupSize, active, onLeave, pendingLeave, kpisToScore, groupLabel = "Team" }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 16, marginBottom: 24 }}>
      <StatCard label={`${groupLabel} Size`} value={groupSize} icon={Users} color="var(--primary)" />
      <StatCard label="Active" value={active} icon={UserCheck} color="var(--success)" />
      <StatCard label="On Leave" value={onLeave} icon={CalendarDays} color="var(--warning)" />
      <StatCard label="Pending Leave" value={pendingLeave} icon={Clock} color="var(--accent)" />
      <StatCard label="KPIs to Score" value={kpisToScore} icon={TrendingUp} color="#8B5CF6" />
    </div>
  )
}
