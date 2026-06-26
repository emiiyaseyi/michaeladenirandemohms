"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronRight, Search, Users } from "lucide-react"

export default function ViewCustomGroupPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [group, setGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch(`/api/people/custom-groups/${id}`).then(r => r.json()).then(d => { setGroup(d.group); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  const members = (group?.members ?? []).filter((m: any) => {
    const q = search.toLowerCase()
    const name = `${m.employee.firstName} ${m.employee.lastName}`
    return !q || name.toLowerCase().includes(q) || (m.employee.employeeId ?? "").toLowerCase().includes(q)
  })

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 13 }}>
        <button onClick={() => router.push("/admin/people/custom-groups")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 600, padding: 0 }}>Custom Groups</button>
        <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
        <span style={{ color: "var(--muted-foreground)" }}>View Custom Group</span>
      </div>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 220, outline: "none" }} />
        </div>
        <button onClick={() => router.push(`/admin/people/custom-groups/${id}/edit`)}
          style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
          Edit
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : !group ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Group not found.</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Users size={32} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{search ? "No results match your search." : "No members in this group."}</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Identification Number</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m: any) => (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                  onClick={() => router.push(`/admin/people/employees/${m.employee.id}`)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                  <td style={td}>{m.employee.firstName} {m.employee.lastName}</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{m.employee.employeeId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && group && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--muted-foreground)" }}>
            {members.length}–{members.length} of {members.length} items
          </div>
        )}
      </div>
    </div>
  )
}
