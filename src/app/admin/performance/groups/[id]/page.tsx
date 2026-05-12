"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Inbox } from "lucide-react"

interface Member { id: string; employee: { id: string; firstName: string; lastName: string; employeeId: string } }

const PAGE_SIZE = 10

export default function ViewPerformanceGroupPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch(`/api/performance/groups/${id}`)
      .then(r => r.json())
      .then(d => { setGroup(d.group); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>
  if (!group) return <div style={{ padding: 40, textAlign: "center", color: "var(--danger)" }}>Group not found</div>

  const members: Member[] = group.members ?? []
  const total = members.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paged = members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "16px 20px", fontSize: 14, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{group.name}</h1>
        <button onClick={() => router.push(`/admin/performance/groups/${id}/edit`)}
          style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Edit Group
        </button>
      </div>

      {/* Members table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>First Name</th>
              <th style={th}>Last Name</th>
              <th style={th}>Identification</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 60, textAlign: "center" }}>
                  <Inbox size={32} strokeWidth={1} style={{ color: "var(--border-strong)", display: "block", margin: "0 auto 10px" }} />
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No members</span>
                </td>
              </tr>
            ) : paged.map(m => (
              <tr key={m.id}>
                <td style={td}>{m.employee.firstName}</td>
                <td style={td}>{m.employee.lastName}</td>
                <td style={td}>{m.employee.employeeId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 16, fontSize: 13, color: "var(--muted-foreground)" }}>
          <span>{start}–{end} of {total} items</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", color: page === 1 ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ‹
          </button>
          <span style={{ width: 28, height: 28, border: "1px solid var(--primary)", borderRadius: 6, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--primary)" }}>{page}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ›
          </button>
        </div>
      )}
    </div>
  )
}
