"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Search } from "lucide-react"

const PAGE_SIZE = 8

interface Batch {
  id: string
  description: string
  startDate: string
  endDate: string
  createdAt: string
}

function RowMenu({ onView }: { onView: () => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
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
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontSize: 18, color: "var(--primary)", fontWeight: 700, lineHeight: 1 }}>
        ···
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, minWidth: 120, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          <button type="button" onClick={() => { onView(); setOpen(false) }}
            style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", background: "none", color: "var(--foreground)" }}
            onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
            onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = "none" }}>
            View
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}

export default function AbsenceBatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [desc, setDesc] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [creating, setCreating] = useState(false)
  const [formErr, setFormErr] = useState("")

  const load = useCallback(() => {
    fetch(`/api/time-tracking/absence/batches?search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => { setBatches(d.batches ?? []); setPage(1) })
  }, [search])

  useEffect(() => { load() }, [load])

  const total = batches.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginated = batches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const handleCreate = async () => {
    if (!desc.trim()) { setFormErr("Description is required"); return }
    if (!startDate || !endDate) { setFormErr("Date range is required"); return }
    setCreating(true); setFormErr("")
    const r = await fetch("/api/time-tracking/absence/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc.trim(), startDate, endDate }),
    })
    setCreating(false)
    if (!r.ok) { const d = await r.json(); setFormErr(d.error ?? "Failed to create"); return }
    setShowCreate(false); setDesc(""); setStartDate(""); setEndDate(""); load()
  }

  const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "14px 16px", fontSize: 13, color: "var(--foreground)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
          <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
            style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
        </div>
        <button type="button" onClick={() => setShowCreate(true)}
          style={{ marginLeft: "auto", padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white", whiteSpace: "nowrap" }}>
          Create new Absence Batch
        </button>
      </div>

      {/* Table card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Description</th>
              <th style={th}>Start Date</th>
              <th style={th}>End Date</th>
              <th style={{ ...th, width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ ...td, textAlign: "center", padding: "48px 0", color: "var(--muted-foreground)" }}>
                  No absence batches found
                </td>
              </tr>
            ) : paginated.map(b => (
              <tr key={b.id}>
                <td style={td}>{b.description}</td>
                <td style={td}>{fmt(b.startDate)}</td>
                <td style={td}>{fmt(b.endDate)}</td>
                <td style={td}><RowMenu onView={() => router.push(`/admin/time-tracking/absence/${b.id}`)} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 0 && (
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)", marginRight: 8 }}>{start}–{end} of {total} items</span>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {"<"}
            </button>
            <span style={{ width: 30, height: 30, border: "1px solid var(--primary)", borderRadius: 6, background: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", opacity: page === totalPages ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {">"}
            </button>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 0, width: 560, boxShadow: "0 16px 48px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Create New Absence Batch</h3>
              <button type="button" onClick={() => setShowCreate(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted-foreground)", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <span style={{ color: "var(--danger)" }}>*</span> Description
                </label>
                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder=""
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" }}>Date Range</label>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--background)" }}>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Start date"
                    style={{ flex: 1, padding: "10px 14px", border: "none", fontSize: 13, background: "transparent", color: "var(--foreground)", outline: "none" }} />
                  <span style={{ color: "var(--muted-foreground)", fontSize: 13, padding: "0 8px" }}>→</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="End date"
                    style={{ flex: 1, padding: "10px 14px", border: "none", fontSize: 13, background: "transparent", color: "var(--foreground)", outline: "none" }} />
                </div>
              </div>
              {formErr && <p style={{ marginTop: 10, fontSize: 12, color: "var(--danger)" }}>{formErr}</p>}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center", gap: 12 }}>
              <button type="button" onClick={() => setShowCreate(false)}
                style={{ padding: "10px 32px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                Cancel
              </button>
              <button type="button" onClick={handleCreate} disabled={creating}
                style={{ padding: "10px 32px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, cursor: creating ? "wait" : "pointer", fontSize: 13, fontWeight: 700, opacity: creating ? 0.7 : 1 }}>
                {creating ? "Creating…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
