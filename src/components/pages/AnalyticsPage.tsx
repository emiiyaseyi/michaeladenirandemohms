"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import StatCard from "@/components/ui/StatCard"
import PageHeader from "@/components/ui/PageHeader"
import EmptyState from "@/components/ui/EmptyState"
import { Users, CalendarDays, Briefcase, UserCheck, BarChart3, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts"

// Chart palette — colours stay hard-coded because they're chart data, not UI tokens.
const COLORS = ["#0052A5","#E3192A","#0B8A4A","#7C3AED","#C2410C","#0E7490","#B45309"]

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/analytics").then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <Card>
      <EmptyState icon={Loader2} title="Loading analytics" description="Pulling the latest organisation-wide metrics…" />
    </Card>
  )
  if (!data) return <Card><EmptyState icon={BarChart3} title="No data" description="Analytics are not available right now." /></Card>

  return (
    <div>
      <PageHeader title="Analytics & Reports" subtitle="Organisation-wide HR insights" icon={<BarChart3 size={22} />} />

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Headcount" value={data.headcount?.total ?? 0} icon={Users} color="var(--primary)" />
        <StatCard label="Active Employees" value={data.headcount?.active ?? 0} icon={UserCheck} color="var(--success)" />
        <StatCard label="Leave Utilisation" value={`${data.leaveRate ?? 0}%`} icon={CalendarDays} color="var(--warning)" />
        <StatCard label="Open Positions" value={data.openJobs ?? 0} icon={Briefcase} color="var(--accent)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 20, marginBottom: 20 }}>
        {/* Headcount by dept */}
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Headcount by Department</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byDepartment ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
              <Bar dataKey="count" fill="var(--primary)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Employment type distribution */}
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Employment Types</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.byType ?? []} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {(data.byType ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 20 }}>
        {/* Leave trends */}
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Leave Requests (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.leaveTrend ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
              <Line type="monotone" dataKey="requests" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)", r: 4 }} />
              <Line type="monotone" dataKey="approved" stroke="var(--success)" strokeWidth={2} dot={{ fill: "var(--success)", r: 4 }} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Recruitment funnel */}
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Recruitment Pipeline</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.recruitmentFunnel ?? []} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={80} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
              <Bar dataKey="count" fill="var(--accent)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
