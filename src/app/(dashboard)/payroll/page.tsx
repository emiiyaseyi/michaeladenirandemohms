import { Download, Plus } from "lucide-react"

const payslips = [
  { id: "DSN-001", name: "Amaka Okonkwo", dept: "Analytics", basic: "₦350,000", allowances: "₦70,000", deductions: "₦42,000", net: "₦378,000", status: "Paid", month: "March 2026" },
  { id: "DSN-002", name: "Emeka Nwachukwu", dept: "Engineering", basic: "₦480,000", allowances: "₦96,000", deductions: "₦57,600", net: "₦518,400", status: "Paid", month: "March 2026" },
  { id: "DSN-003", name: "Fatima Aliyu", dept: "Operations", basic: "₦420,000", allowances: "₦84,000", deductions: "₦50,400", net: "₦453,600", status: "Paid", month: "March 2026" },
  { id: "DSN-004", name: "Chidi Obiora", dept: "Research", basic: "₦520,000", allowances: "₦104,000", deductions: "₦62,400", net: "₦561,600", status: "Processing", month: "March 2026" },
  { id: "DSN-005", name: "Ngozi Adeyemi", dept: "Human Resources", basic: "₦280,000", allowances: "₦56,000", deductions: "₦33,600", net: "₦302,400", status: "Paid", month: "March 2026" },
]

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Payroll
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            March 2026 – Salary processing and payslips
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
            style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
          >
            <Download size={16} />
            Export
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--primary)" }}
          >
            <Plus size={16} />
            Run Payroll
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Gross", value: "₦52.8M", sub: "March 2026" },
          { label: "Total Deductions", value: "₦7.6M", sub: "Tax & Pension" },
          { label: "Total Net Pay", value: "₦45.2M", sub: "247 employees" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border p-5"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{item.value}</p>
            <p className="text-sm font-medium mt-1" style={{ color: "var(--muted-foreground)" }}>{item.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--background)" }}>
                {["Employee", "Department", "Basic", "Allowances", "Deductions", "Net Pay", "Status", ""].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payslips.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: i < payslips.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                        style={{ background: "var(--primary)" }}
                      >
                        {p.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{p.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: "var(--muted-foreground)" }}>{p.dept}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: "var(--foreground)" }}>{p.basic}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: "var(--success)" }}>{p.allowances}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: "var(--danger)" }}>{p.deductions}</td>
                  <td className="px-6 py-4 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{p.net}</td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: p.status === "Paid" ? "var(--success-bg)" : "var(--warning-bg)",
                        color: p.status === "Paid" ? "var(--success)" : "var(--warning)",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1"
                      style={{ background: "var(--background)", color: "var(--primary)", border: "1px solid var(--border)" }}
                    >
                      <Download size={12} />
                      Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
