"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import EmptyState from "@/components/ui/EmptyState"
import { UserMinus, Search } from "lucide-react"
import { formatDate } from "@/lib/utils"

const EXIT_TYPE_LABEL: Record<string, string> = {
  RESIGNATION: "Resignation",
  TERMINATION: "Termination",
  RETIREMENT: "Retirement",
  CONTRACT_END: "Contract End",
  REDUNDANCY: "Redundancy",
}

export default function PeopleExitsPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/people/exits")
      .then(r => r.json())
      .then(d => { setEmployees(d.employees ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    return !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.jobTitle?.toLowerCase().includes(q)
  })

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Exits</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
            {loading ? "Loading…" : `${employees.length} employee${employees.length !== 1 ? "s" : ""} have left the organisation`}
          </p>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or title…"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 240 }}
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={UserMinus} title="No exits found" description={search ? "No results match your search." : "No employees have exited the organisation yet."} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Employee", "Department", "Exit Type", "Last Working Day", "Status"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp: any) => (
                  <tr key={emp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={34} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{emp.jobTitle ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>{emp.department?.name ?? "—"}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13 }}>{EXIT_TYPE_LABEL[emp.offboarding?.exitType] ?? emp.employeeStatus?.toLowerCase()}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>
                      {emp.offboarding?.lastWorkingDay ? formatDate(emp.offboarding.lastWorkingDay) : "—"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <Badge status={emp.offboarding?.status ?? emp.employeeStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
