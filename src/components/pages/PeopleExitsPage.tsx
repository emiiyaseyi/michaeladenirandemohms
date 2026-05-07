"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import EmptyState from "@/components/ui/EmptyState"
import { UserMinus, Search, MoreHorizontal, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

const EXIT_TYPE_LABEL: Record<string, string> = {
  RESIGNATION: "Resignation",
  TERMINATION: "Termination",
  RETIREMENT: "Retirement",
  CONTRACT_END: "Contract End",
  REDUNDANCY: "Redundancy",
  VOLUNTARY_RESIGNATION: "Voluntary Resignation",
  END_OF_CONTRACT: "End of contract",
}

function RowMenu({ emp, onView, onRehire }: { emp: any; onView: () => void; onRehire: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 140, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onView() }}
            style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            View
          </button>
          <button onClick={() => { setOpen(false); onRehire() }}
            style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            Rehire
          </button>
        </div>
      )}
    </div>
  )
}

export default function PeopleExitsPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [rehireTarget, setRehireTarget] = useState<any>(null)
  const [rehiring, setRehiring] = useState(false)

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

  const doRehire = async () => {
    if (!rehireTarget) return
    setRehiring(true)
    await fetch(`/api/employees/${rehireTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeStatus: "ACTIVE" }),
    })
    setEmployees(prev => prev.filter(e => e.id !== rehireTarget.id))
    setRehireTarget(null)
    setRehiring(false)
  }

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13 }

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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or title…"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 240 }} />
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
                  {["Employee", "Department", "Exit Type", "Last Working Day", "Status", ""].map((h, i) => (
                    <th key={i} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp: any) => (
                  <tr key={emp.id} onClick={() => router.push(`/admin/people/employees/${emp.id}`)}
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={34} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{emp.jobTitle ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, color: "var(--muted-foreground)" }}>{emp.department?.name ?? "—"}</td>
                    <td style={td}>{EXIT_TYPE_LABEL[emp.offboarding?.exitType] ?? (emp.employeeStatus === "RESIGNED" ? "Voluntary Resignation" : emp.employeeStatus === "TERMINATED" ? "Termination" : "—")}</td>
                    <td style={{ ...td, color: "var(--muted-foreground)" }}>{emp.offboarding?.lastWorkingDay ? formatDate(emp.offboarding.lastWorkingDay) : "—"}</td>
                    <td style={td}><Badge status={emp.offboarding?.status ?? emp.employeeStatus} /></td>
                    <td style={{ ...td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      <RowMenu emp={emp}
                        onView={() => router.push(`/admin/people/employees/${emp.id}`)}
                        onRehire={() => setRehireTarget(emp)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Rehire modal */}
      {rehireTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 480, padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Rehire Employee</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 28 }}>
              If you rehire <strong>{rehireTarget.firstName} {rehireTarget.lastName}</strong>, they'll be able to partake in all company activities and will be included in future payroll. Click Confirm to continue.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setRehireTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doRehire} disabled={rehiring}
                style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: rehiring ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                {rehiring && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                {rehiring ? "Rehiring…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
