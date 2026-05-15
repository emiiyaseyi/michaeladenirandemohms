"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

function ConfirmModal({ title, message, onConfirm, onCancel, confirming }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; confirming: boolean
}) {
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={16} style={{ color: "var(--muted-foreground)" }} /></button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 14, color: "var(--foreground)", marginBottom: 4 }}>Are you sure you want to release this asset?</div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Click confirm to continue action.</div>
        </div>
        <div style={{ padding: "0 24px 20px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel}
            style={{ padding: "9px 22px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={confirming}
            style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: confirming ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: confirming ? 0.7 : 1 }}>
            {confirming ? "Releasing…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const PAGE_SIZE = 10

export default function EmployeeAssetsPage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.employeeId as string

  const [employee, setEmployee] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [releaseTarget, setReleaseTarget] = useState<string | null>(null) // single assignment id
  const [showBulkRelease, setShowBulkRelease] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const load = () => {
    fetch(`/api/assignments/employee/${employeeId}`)
      .then(r => r.json())
      .then(d => {
        setAssignments(d.assignments ?? [])
        setEmployee(d.employee)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [employeeId])

  const totalPages = Math.max(1, Math.ceil(assignments.length / PAGE_SIZE))
  const paged = assignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, assignments.length)

  const allPageSelected = paged.length > 0 && paged.every(a => selected.has(a.id))
  const somePageSelected = paged.some(a => selected.has(a.id))

  const toggleAll = () => {
    if (allPageSelected) {
      const next = new Set(selected)
      paged.forEach(a => next.delete(a.id))
      setSelected(next)
    } else {
      const next = new Set(selected)
      paged.forEach(a => next.add(a.id))
      setSelected(next)
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  // release single — find asset id from assignment
  const releaseAssignment = async (assignment: any) => {
    setConfirming(true)
    await fetch(`/api/assets/${assignment.assetId}/assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release" }),
    })
    setConfirming(false)
    setReleaseTarget(null)
    setSelected(new Set())
    load()
  }

  const releaseAll = async () => {
    setConfirming(true)
    await fetch(`/api/assignments/employee/${employeeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release-all" }),
    })
    setConfirming(false)
    setShowBulkRelease(false)
    setSelected(new Set())
    load()
  }

  const th: React.CSSProperties = { padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "16px 20px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--foreground)" }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>

  const releaseTargetAssignment = releaseTarget ? assignments.find(a => a.id === releaseTarget) : null

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          {employee ? `${employee.firstName} ${employee.lastName}` : "Employee"}
        </div>
        <button onClick={() => setShowBulkRelease(true)}
          style={{ padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
          Release all assets
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 52 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={allPageSelected} ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                    onChange={toggleAll} style={{ width: 14, height: 14, accentColor: "var(--primary)", cursor: "pointer" }} />
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>∨</span>
                </div>
              </th>
              <th style={th}>Asset Name</th>
              <th style={th}>Asset ID</th>
              <th style={th}>Assigned On</th>
              <th style={th}>Description</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No assets assigned.</td></tr>
            ) : paged.map(a => {
              const isAssigned = a.status === "ASSIGNED"
              const assignedDate = a.assignedOn ? new Date(a.assignedOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"
              const isChecked = selected.has(a.id)

              return (
                <tr key={a.id} style={{ background: isChecked ? "var(--muted)" : "" }}
                  onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                  onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "" }}>
                  <td style={td}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleOne(a.id)}
                      style={{ width: 14, height: 14, accentColor: "var(--primary)", cursor: "pointer" }} />
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{a.asset?.name}</div>
                    {a.asset?.assetType?.name && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{a.asset.assetType.name}</div>}
                  </td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{a.asset?.identifier ?? "—"}</td>
                  <td style={td}>{assignedDate}</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{a.description ?? "—"}</td>
                  <td style={td}>
                    <span style={{
                      fontSize: 12, padding: "3px 12px", borderRadius: 999, fontWeight: 600, display: "inline-block",
                      background: isAssigned ? "rgba(234,179,8,0.15)" : "var(--success-bg)",
                      color: isAssigned ? "#92400e" : "var(--success)",
                      border: `1px solid ${isAssigned ? "rgba(234,179,8,0.4)" : "transparent"}`,
                    }}>
                      {isAssigned ? "Assigned" : "Released"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {isAssigned ? (
                      <button onClick={() => setReleaseTarget(a.id)}
                        style={{ padding: "7px 20px", background: "var(--primary)", border: "none", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "white" }}>
                        Release
                      </button>
                    ) : (
                      <button disabled
                        style={{ padding: "7px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 999, cursor: "default", fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>
                        Released
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {assignments.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", fontSize: 14, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: n === page ? "var(--primary)" : "var(--card)", cursor: "pointer", fontSize: 12, color: n === page ? "white" : "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: n === page ? 700 : 400 }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", fontSize: 14, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === totalPages ? 0.4 : 1 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Single release modal */}
      {releaseTarget && releaseTargetAssignment && (
        <ConfirmModal
          title="Release asset"
          message=""
          onConfirm={() => releaseAssignment(releaseTargetAssignment)}
          onCancel={() => setReleaseTarget(null)}
          confirming={confirming}
        />
      )}

      {/* Bulk / release-all modal */}
      {showBulkRelease && (
        <ConfirmModal
          title="Confirm action"
          message=""
          onConfirm={releaseAll}
          onCancel={() => setShowBulkRelease(false)}
          confirming={confirming}
        />
      )}
    </div>
  )
}
