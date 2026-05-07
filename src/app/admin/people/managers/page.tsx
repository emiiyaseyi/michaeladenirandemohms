"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Users } from "lucide-react"

function Av({ name, photo, size = 36 }: { name: string; photo?: string | null; size?: number }) {
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "white", flexShrink: 0 }}>
      {initials}
    </div>
  )
}

const PAGE_SIZE = 10

export default function ManagersPage() {
  const router = useRouter()
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch("/api/people/managers")
      .then(r => r.json())
      .then(d => { setManagers(d.managers ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = managers.filter(m => {
    const q = search.toLowerCase()
    return !q || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.jobTitle?.toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search managers…"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 240, outline: "none" }} />
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {/* Card header with description */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Data Science Nigeria Managers</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            People Managers oversee other employees at your Company. They manage their team's requests, time tracking, and employee information.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Users size={32} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No managers found</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{search ? "No results match your search." : "No employees have direct reports yet."}</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Employee</th>
                <th style={th}>Title</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(m => (
                <tr key={m.id} onClick={() => router.push(`/admin/people/employees/${m.id}`)}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Av name={`${m.firstName} ${m.lastName}`} photo={m.profilePhoto} />
                      <div>
                        <div style={{ fontWeight: 700 }}>{m.firstName} {m.lastName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{m.workEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{m.jobTitle ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} items
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 6, background: page === p ? "var(--primary)" : "var(--background)", color: page === p ? "white" : "var(--foreground)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
