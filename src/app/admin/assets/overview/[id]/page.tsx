"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { createPortal } from "react-dom"
import { Search, MoreHorizontal, User } from "lucide-react"

function RowMenu({ onRelease, onRemove, status }: { onRelease: () => void; onRemove: () => void; status: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--primary)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 130, padding: "4px 0" }}>
          {status === "ASSIGNED" && (
            <button onClick={() => { setOpen(false); onRelease() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>Release</button>
          )}
          <button onClick={() => { setOpen(false); onRemove() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--danger)", textAlign: "left" }}>Remove</button>
        </div>,
        document.body
      )}
    </>
  )
}

export default function AssetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [asset, setAsset] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)

  const load = () => {
    fetch(`/api/assets/${id}`)
      .then(r => r.json())
      .then(d => { setAsset(d.asset); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/assets/${id}`, { method: "DELETE" })
    router.push("/admin/assets/overview")
  }

  const handleAssignmentAction = async (assignmentId: string, action: "release" | "remove") => {
    setActioning(assignmentId)
    await fetch(`/api/assets/${id}/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setActioning(null)
    load()
  }

  const filtered = asset?.assignments?.filter((a: any) => {
    if (!search) return true
    const name = `${a.employee.firstName} ${a.employee.lastName}`.toLowerCase()
    return name.includes(search.toLowerCase())
  }) ?? []

  const th: React.CSSProperties = { padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "16px 20px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--foreground)" }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
  if (!asset) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Asset not found.</div>

  return (
    <div>
      {/* Header toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 0 240px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", width: "100%" }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => router.push(`/admin/assets/overview/${id}/edit`)}
          style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
          Edit details
        </button>
        <button onClick={() => setShowDelete(true)}
          style={{ padding: "9px 20px", background: "var(--danger)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
          Delete
        </button>
        <button onClick={() => router.push(`/admin/assets/overview/${id}/employees`)}
          style={{ padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
          Add or remove employees
        </button>
      </div>

      {/* Card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{asset.name}</div>
          {asset.identifier && <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>{asset.identifier}</div>}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Employee</th>
              <th style={th}>Location</th>
              <th style={th}>Department</th>
              <th style={th}>Assigned On</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 52 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                {search ? "No results match your search." : "No employees assigned yet."}
              </td></tr>
            ) : filtered.map((a: any) => {
              const assignedDate = a.assignedOn ? new Date(a.assignedOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"
              const releasedDate = a.releasedAt ? new Date(a.releasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null

              return (
                <tr key={a.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {a.employee.profilePhoto ? (
                          <img src={a.employee.profilePhoto} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <User size={16} style={{ color: "var(--muted-foreground)" }} />
                        )}
                      </div>
                      <span>{a.employee.firstName} {a.employee.lastName}</span>
                    </div>
                  </td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>—</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{a.employee.department?.name ?? "—"}</td>
                  <td style={td}>{assignedDate}</td>
                  <td style={td}>
                    {a.status === "RELEASED" ? (
                      <div>
                        <span style={{ fontSize: 12, padding: "3px 12px", borderRadius: 999, fontWeight: 600, background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)", display: "inline-block" }}>Released</span>
                        {releasedDate && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{releasedDate}</div>}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, padding: "3px 12px", borderRadius: 999, fontWeight: 600, background: "rgba(234,179,8,0.15)", color: "#92400e", border: "1px solid rgba(234,179,8,0.3)", display: "inline-block" }}>Assigned</span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right", opacity: actioning === a.id ? 0.5 : 1 }}>
                    <RowMenu
                      status={a.status}
                      onRelease={() => handleAssignmentAction(a.id, "release")}
                      onRemove={() => handleAssignmentAction(a.id, "remove")}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Delete modal */}
      {showDelete && typeof window !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: "32px 36px", width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Confirm action</div>
            <div style={{ fontSize: 14, color: "var(--foreground)", marginBottom: 4 }}>Are you sure you want to delete this asset?</div>
            <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 28 }}>Click Delete to continue.</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowDelete(false)}
                style={{ padding: "9px 22px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: "9px 22px", background: "var(--danger)", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
