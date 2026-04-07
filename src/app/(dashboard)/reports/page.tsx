import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Reports & Analytics
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Insights and data across your workforce
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Headcount Report", icon: Users, desc: "Employee count by dept & type" },
          { label: "Payroll Summary", icon: DollarSign, desc: "Monthly payroll analytics" },
          { label: "Leave Analysis", icon: BarChart3, desc: "Leave patterns & utilization" },
          { label: "Attrition Report", icon: TrendingUp, desc: "Turnover & retention rates" },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              className="rounded-xl border p-5 text-left transition-all hover:shadow-md"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: "#e8effa" }}
              >
                <Icon size={20} style={{ color: "var(--primary)" }} />
              </div>
              <p className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>
                {item.label}
              </p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {item.desc}
              </p>
            </button>
          )
        })}
      </div>

      <div
        className="rounded-xl border p-8 flex items-center justify-center"
        style={{ background: "var(--card)", borderColor: "var(--border)", minHeight: 320 }}
      >
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto mb-4" style={{ color: "var(--muted-foreground)" }} />
          <p className="font-medium" style={{ color: "var(--foreground)" }}>
            Charts coming soon
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Select a report type above to view visualizations
          </p>
        </div>
      </div>
    </div>
  )
}
