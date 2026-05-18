"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Users, Plus, Shield, X, Loader2, Trash2 } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

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
  const { user: me } = useCurrentUser()
  const isSuperAdmin = me?.role === "SUPER_ADMIN"

  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const [addOpen, setAddOpen] = useState(false)
  const [eligible, setEligible] = useState<any[]>([])
  const [addSearch, setAddSearch] = useState("")
  const [adding, setAdding] = useState(false)
  const [addErr, setAddErr] = useState("")

  const [removeTarget, setRemoveTarget] = useState<any | null>(null)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/people/managers")
    const d = await r.json()
    setManagers(d.managers ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = async () => {
    setAddErr("")
    setAddSearch("")
    const r = await fetch("/api/people/managers/eligible")
    const d = await r.json()
    setEligible(d.eligible ?? [])
    setAddOpen(true)
  }

  const doAdd = async (employeeId: string) => {
    setAdding(true); setAddErr("")
    const r = await fetch("/api/people/managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId }),
    })
    const d = await r.json()
    setAdding(false)
    if (!r.ok) { setAddErr(d.error ?? "Failed to add manager"); return }
    setAddOpen(false)
    load()
  }

  const doRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    const r = await fetch(`/api/people/managers/${removeTarget.employee.id}`, { method: "DELETE" })
    setRemoving(false)
    if (r.ok) { setRemoveTarget(null); load() }
  }

  const filtered = managers.filter(m => {
    const q = search.toLowerCase()
    return !q || `${m.employee.firstName} ${m.employee.lastName}`.toLowerCase().includes(q) || m.employee.jobTitle?.toLowerCase().includes(q)
  })

  const filteredEligible = eligible.filter(e => {
    const q = addSearch.toLowerCase()
    return !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.jobTitle?.toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ marginBottom: 20, display: "flex", gap: 12, rowGap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search managers…"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 240, outline: "none" }} />
        </div>
        {isSuperAdmin && (
          <button onClick={openAdd}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            <Plus size={14} /> Add Manager
          </button>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Data Science Nigeria Managers</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Managers sit above Project Leads in the org chart. Only the Super Admin can add or remove managers.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Users size={32} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No managers yet</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{search ? "No results match your search." : isSuperAdmin ? "Add one from your Project Leads." : "Managers will appear here once the Super Admin adds them."}</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Manager</th>
                <th style={th}>Title</th>
                <th style={th}>Department</th>
                <th style={th}>Source</th>
                {isSuperAdmin && <th style={{ ...th, textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map(m => {
                const emp = m.employee
                return (
                  <tr key={m.id}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <td style={td} onClick={() => router.push(`/admin/people/employees/${emp.id}`)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Av name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{emp.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, color: "var(--muted-foreground)" }} onClick={() => router.push(`/admin/people/employees/${emp.id}`)}>{emp.jobTitle ?? "—"}</td>
                    <td style={{ ...td, color: "var(--muted-foreground)" }} onClick={() => router.push(`/admin/people/employees/${emp.id}`)}>{emp.department?.name ?? "—"}</td>
                    <td style={td} onClick={() => router.push(`/admin/people/employees/${emp.id}`)}>
                      {m.isSystem
                        ? <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)", display: "inline-flex", alignItems: "center", gap: 4 }}><Shield size={11} /> Seeded</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "var(--success-bg)", color: "var(--success)" }}>Added</span>}
                    </td>
                    {isSuperAdmin && (
                      <td style={{ ...td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                        {!m.isSystem && (
                          <button onClick={() => setRemoveTarget(m)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!loading && filtered.length > 0 && totalPages > 1 && (
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

      {/* Add Manager modal — browsable list of eligible PLs */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--card)", borderRadius: 16, maxWidth: 560, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Add Manager</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Pick a Project Lead to mark as manager.</div>
              </div>
              <button onClick={() => setAddOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                <input autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Filter project leads…"
                  style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filteredEligible.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                  {eligible.length === 0 ? "No Project Leads available to add." : "No results."}
                </div>
              ) : filteredEligible.map(e => (
                <div key={e.id}
                  style={{ padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, cursor: adding ? "wait" : "pointer", borderBottom: "1px solid var(--border)" }}
                  onClick={() => !adding && doAdd(e.id)}
                  onMouseEnter={ev => !adding && ((ev.currentTarget as HTMLElement).style.background = "var(--muted)")}
                  onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = ""}>
                  <Av name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.firstName} {e.lastName}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.jobTitle ?? "—"} {e.department?.name ? `· ${e.department.name}` : ""}</div>
                  </div>
                  {adding && <Loader2 size={14} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} />}
                </div>
              ))}
            </div>
            {addErr && (
              <div style={{ padding: "10px 24px", background: "var(--danger-bg)", color: "var(--danger)", fontSize: 13 }}>{addErr}</div>
            )}
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Remove Manager confirmation modal */}
      {removeTarget && (
        <div onClick={() => !removing && setRemoveTarget(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--card)", borderRadius: 16, maxWidth: 440, width: "100%", padding: "24px 28px", border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Remove Manager?</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65, marginBottom: 18 }}>
              <strong style={{ color: "var(--foreground)" }}>{removeTarget.employee.firstName} {removeTarget.employee.lastName}</strong> will no longer be listed as a manager. Their PROJECT_LEAD system role and any separately granted admin role stay unchanged.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setRemoveTarget(null)} disabled={removing}
                style={{ padding: "8px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doRemove} disabled={removing}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "var(--danger)", border: "none", borderRadius: 8, cursor: removing ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
                {removing && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                {removing ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  )
}
