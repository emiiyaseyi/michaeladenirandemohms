"use client"
import StatCard from "@/components/ui/StatCard"
import { Users, UserCheck, CalendarDays, Building2, Briefcase, Clock } from "lucide-react"

interface Props {
  totalEmployees: number
  activeEmployees: number
  onLeave: number
  departments: number
  openJobs: number
  pendingLeave: number
}

export default function OrgStatsRow({ totalEmployees, activeEmployees, onLeave, departments, openJobs, pendingLeave }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: 16, marginBottom: 24 }}>
      <StatCard label="Total Employees" value={totalEmployees} icon={Users} color="var(--primary)" />
      <StatCard label="Active" value={activeEmployees} icon={UserCheck} color="var(--success)" />
      <StatCard label="On Leave" value={onLeave} icon={CalendarDays} color="var(--warning)" />
      <StatCard label="Departments" value={departments} icon={Building2} color="#6366F1" />
      <StatCard label="Open Positions" value={openJobs} icon={Briefcase} color="#F59E0B" />
      <StatCard label="Pending Leave" value={pendingLeave} icon={Clock} color="var(--accent)" />
    </div>
  )
}
