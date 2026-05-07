"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { MoreVertical, Inbox, X, ChevronDown, ChevronUp, Calendar, Clock, Pencil, Trash2, Search } from "lucide-react"

const CONV_TYPES: Record<string, string> = {
  CHECK_IN: "Check-in", ONBOARDING: "Onboarding", CAREER: "Career",
  REALIGNMENT: "Re-alignment", OTHER: "Other",
}
const FREQ_LABELS: Record<string, string> = {
  ONE_OFF: "One-off", WEEKLY: "Weekly", BIWEEKLY: "Biweekly", MONTHLY: "Monthly",
}
const PAGE_SIZE = 10

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function RowMenu({ items }: { items: { label: string; action: () => void; danger?: boolean }[] }) {
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
      <button ref={btnRef} onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreVertical size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 9999, minWidth: 120, overflow: "hidden" }}>
          {items.map(item => (
            <button key={item.label} onClick={() => { setOpen(false); item.action() }}
              style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: item.danger ? "var(--danger)" : "var(--foreground)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

const TABS = ["Rounds", "Setup", "Prompts"] as const
type Tab = typeof TABS[number]

// ── Rounds tab ────────────────────────────────────────────────────────────────
function RoundsTab() {
  const [rounds, setRounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [drawer, setDrawer] = useState<any>(null)

  useEffect(() => {
    fetch("/api/performance/conversations/rounds")
      .then(r => r.json())
      .then(d => { setRounds(d.rounds ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const total = rounds.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paged = rounds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "16px 20px", fontSize: 14, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }

  return (
    <>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Employee</th>
              <th style={th}>Conversation with</th>
              <th style={th}>Schedule Time</th>
              <th style={th}>Conversation Type</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>Loading…</td></tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 60, textAlign: "center" }}>
                  <Inbox size={36} strokeWidth={1} style={{ color: "var(--border-strong)", display: "block", margin: "0 auto 10px" }} />
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No rounds yet</span>
                </td>
              </tr>
            ) : paged.map(r => (
              <tr key={r.id}>
                <td style={td}>{r.setup.employee.firstName} {r.setup.employee.lastName}</td>
                <td style={td}>{r.setup.conversationWith}</td>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{fmtDate(r.scheduledDate)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{r.startTime}–{r.endTime}</div>
                </td>
                <td style={td}>{CONV_TYPES[r.conversationType] ?? r.conversationType}</td>
                <td style={td}>
                  <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                    {r.status === "OTHER" ? "Other" : r.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                  <RowMenu items={[{ label: "View", action: () => setDrawer(r) }]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && total > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 16, fontSize: 13, color: "var(--muted-foreground)" }}>
          <span>{start}–{end} of {total} items</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", color: page === 1 ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ width: 28, height: 28, border: "1px solid var(--primary)", borderRadius: 6, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--primary)" }}>{page}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>
      )}
      {drawer && <RoundDrawer roundId={drawer.id} roundData={drawer} onClose={() => setDrawer(null)} />}
    </>
  )
}

// ── Round Drawer ──────────────────────────────────────────────────────────────
function RoundDrawer({ roundId, roundData, onClose }: { roundId: string; roundData: any; onClose: () => void }) {
  const [round, setRound] = useState<any>(roundData)
  const [actionsOpen, setActionsOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const [actionTitle, setActionTitle] = useState("")
  const [actionStart, setActionStart] = useState("")
  const [actionEnd, setActionEnd] = useState("")
  const [actionErrors, setActionErrors] = useState({ title: false, start: false, end: false })
  const [noteText, setNoteText] = useState("")
  const [noteError, setNoteError] = useState(false)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editNoteText, setEditNoteText] = useState("")

  useEffect(() => {
    fetch(`/api/performance/conversations/rounds/${roundId}`)
      .then(r => r.json())
      .then(d => { if (d.round) setRound(d.round) })
  }, [roundId])

  const addAction = async () => {
    const errs = { title: !actionTitle.trim(), start: !actionStart, end: !actionEnd }
    setActionErrors(errs)
    if (errs.title || errs.start || errs.end) return
    const r = await fetch(`/api/performance/conversations/rounds/${roundId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: actionTitle.trim(), startDate: actionStart, endDate: actionEnd }),
    })
    if (r.ok) {
      const d = await r.json()
      setRound((prev: any) => ({ ...prev, actions: [...(prev.actions ?? []), d.action] }))
      setActionTitle(""); setActionStart(""); setActionEnd("")
      setActionErrors({ title: false, start: false, end: false })
    }
  }

  const deleteAction = async (actionId: string) => {
    await fetch(`/api/performance/conversations/rounds/${roundId}/actions/${actionId}`, { method: "DELETE" })
    setRound((prev: any) => ({ ...prev, actions: prev.actions.filter((a: any) => a.id !== actionId) }))
  }

  const addNote = async () => {
    if (!noteText.trim()) { setNoteError(true); return }
    setNoteError(false)
    const r = await fetch(`/api/performance/conversations/rounds/${roundId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText.trim() }),
    })
    if (r.ok) {
      const d = await r.json()
      setRound((prev: any) => ({ ...prev, notes: [...(prev.notes ?? []), d.note] }))
      setNoteText("")
    }
  }

  const saveNote = async (noteId: string) => {
    const r = await fetch(`/api/performance/conversations/rounds/${roundId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editNoteText }),
    })
    if (r.ok) {
      setRound((prev: any) => ({ ...prev, notes: prev.notes.map((n: any) => n.id === noteId ? { ...n, content: editNoteText } : n) }))
      setEditingNote(null)
    }
  }

  const deleteNote = async (noteId: string) => {
    await fetch(`/api/performance/conversations/rounds/${roundId}/notes/${noteId}`, { method: "DELETE" })
    setRound((prev: any) => ({ ...prev, notes: prev.notes.filter((n: any) => n.id !== noteId) }))
  }

  const convType = CONV_TYPES[round.conversationType] ?? round.conversationType
  const convWith = round.setup?.conversationWith ?? ""

  const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }
  const inpErr: React.CSSProperties = { ...inp, borderColor: "var(--danger)" }

  return typeof window !== "undefined" ? createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.3)" }} onClick={onClose} />
      <div style={{ width: 520, background: "var(--card)", height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.4 }}>
            {convType} Conversation with {convWith}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2, flexShrink: 0 }}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 20, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <Calendar size={14} style={{ color: "var(--muted-foreground)" }} />
            <span style={{ color: "var(--muted-foreground)" }}>Date:</span>
            <strong>{fmtDate(round.scheduledDate)}</strong>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <Clock size={14} style={{ color: "var(--muted-foreground)" }} />
            <span style={{ color: "var(--muted-foreground)" }}>Time:</span>
            <strong>{round.startTime} - {round.endTime}</strong>
          </span>
          <span style={{ padding: "3px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
            {round.status === "OTHER" ? "Other" : round.status}
          </span>
        </div>
        <div style={{ flex: 1, padding: "16px 0 24px" }}>
          {/* Prompts for Discussion */}
          <div style={{ margin: "0 24px", background: "var(--muted)", borderRadius: 10, padding: "14px 20px" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Prompts for Discussion</span>
          </div>

          {/* Actions */}
          <div style={{ margin: "16px 24px 0", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <button onClick={() => setActionsOpen(v => !v)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", color: "var(--foreground)" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Actions</span>
              {actionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {actionsOpen && (
              <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
                {(round.actions ?? []).map((a: any) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{fmtDate(a.startDate)} – {fmtDate(a.endDate)}</div>
                    </div>
                    <button onClick={() => deleteAction(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                ))}
                <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <input value={actionTitle} onChange={e => { setActionTitle(e.target.value); setActionErrors(v => ({ ...v, title: false })) }}
                      placeholder="Add New Action" style={actionErrors.title ? inpErr : inp} />
                    {actionErrors.title && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>Please enter this field!</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <div style={{ flex: 1 }}>
                        <input type="date" value={actionStart} onChange={e => { setActionStart(e.target.value); setActionErrors(v => ({ ...v, start: false })) }}
                          style={actionErrors.start ? inpErr : inp} />
                        {actionErrors.start && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>Please enter this field!</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <input type="date" value={actionEnd} onChange={e => { setActionEnd(e.target.value); setActionErrors(v => ({ ...v, end: false })) }}
                          style={actionErrors.end ? inpErr : inp} />
                        {actionErrors.end && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>Please enter this field!</div>}
                      </div>
                    </div>
                  </div>
                  <button onClick={addAction}
                    style={{ width: 40, height: 40, background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", color: "white", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ margin: "16px 24px 0", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <button onClick={() => setNotesOpen(v => !v)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", color: "var(--foreground)" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Notes</span>
              {notesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {notesOpen && (
              <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
                {(round.notes ?? []).map((n: any) => (
                  <div key={n.id} style={{ marginBottom: 8, marginTop: 12 }}>
                    {editingNote === n.id ? (
                      <div style={{ background: "var(--muted)", borderRadius: 8, padding: 12 }}>
                        <textarea value={editNoteText} onChange={e => setEditNoteText(e.target.value)}
                          style={{ ...inp, resize: "vertical", minHeight: 80 }} />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                          <button onClick={() => setEditingNote(null)} style={{ padding: "7px 20px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Cancel</button>
                          <button onClick={() => saveNote(n.id)} style={{ padding: "7px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Update</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--muted)", borderRadius: 8 }}>
                        <span style={{ fontSize: 13 }}>{n.content}</span>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button onClick={() => { setEditingNote(n.id); setEditNoteText(n.content) }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><Pencil size={13} /></button>
                          <button onClick={() => deleteNote(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <textarea value={noteText} onChange={e => { setNoteText(e.target.value); setNoteError(false) }}
                      placeholder="Add new note"
                      style={{ ...(noteError ? inpErr : inp), resize: "vertical", minHeight: 80 }} />
                    {noteError && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>Please enter this field!</div>}
                  </div>
                  <button onClick={addNote}
                    style={{ width: 40, height: 40, background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", color: "white", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null
}

// ── Setup tab ────────────────────────────────────────────────────────────────
function SetupTab() {
  const router = useRouter()
  const [setups, setSetups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    fetch("/api/performance/conversations/setups")
      .then(r => r.json())
      .then(d => { setSetups(d.setups ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/performance/conversations/setups/${deleteId}`, { method: "DELETE" })
    setSetups(s => s.filter(x => x.id !== deleteId))
    setDeleteId(null); setDeleting(false)
  }

  const total = setups.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paged = setups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "16px 20px", fontSize: 14, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => router.push("/admin/performance/conversations/setup/new")}
          style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Schedule Conversation
        </button>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Employee</th>
              <th style={th}>Conversation with</th>
              <th style={th}>Schedule Time</th>
              <th style={th}>Frequency</th>
              <th style={th}>Conversation Type</th>
              <th style={{ ...th, width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>Loading…</td></tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 60, textAlign: "center" }}>
                  <Inbox size={36} strokeWidth={1} style={{ color: "var(--border-strong)", display: "block", margin: "0 auto 10px" }} />
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No setups yet</span>
                </td>
              </tr>
            ) : paged.map(s => {
              const lastRound = s.rounds?.[0]
              return (
                <tr key={s.id}>
                  <td style={td}>{s.employee.firstName} {s.employee.lastName}</td>
                  <td style={td}>{s.conversationWith}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{fmtDate(s.scheduledDate)}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{s.startTime}–{s.endTime}</div>
                  </td>
                  <td style={td}>
                    <div>{FREQ_LABELS[s.frequency] ?? s.frequency}</div>
                    {lastRound && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Last Schedule: {fmtDate(lastRound.scheduledDate)}</div>}
                  </td>
                  <td style={td}>{CONV_TYPES[s.conversationType] ?? s.conversationType}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                    <RowMenu items={[
                      { label: "Edit", action: () => router.push(`/admin/performance/conversations/setup/${s.id}/edit`) },
                      { label: "Delete", action: () => setDeleteId(s.id), danger: true },
                    ]} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!loading && total > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 16, fontSize: 13, color: "var(--muted-foreground)" }}>
          <span>{start}–{end} of {total} items</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", color: page === 1 ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ width: 28, height: 28, border: "1px solid var(--primary)", borderRadius: 6, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--primary)" }}>{page}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>
      )}
      {deleteId && typeof window !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div style={{ background: "var(--card)", borderRadius: 12, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Delete Setup</span>
              <button onClick={() => setDeleteId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.6 }}>
                If you delete this setup, future rounds won&apos;t be scheduled. You can undo this action later. Click delete to continue.
              </p>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "9px 24px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} style={{ padding: "9px 24px", background: "var(--danger)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ── Prompts tab ──────────────────────────────────────────────────────────────
const PROMPT_TYPES = [
  { value: "CHECK_IN", label: "Check-in" },
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "CAREER", label: "Career" },
  { value: "REALIGNMENT", label: "Re-alignment" },
]

function PromptsTab() {
  const router = useRouter()
  const [prompts, setPrompts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("CHECK_IN")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ type, ...(search ? { search } : {}) })
    fetch(`/api/performance/conversations/prompts?${params}`)
      .then(r => r.json())
      .then(d => { setPrompts(d.prompts ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [type, search])

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/performance/conversations/prompts/${deleteId}`, { method: "DELETE" })
    setPrompts(p => p.filter(x => x.id !== deleteId))
    setDeleteId(null); setDeleting(false)
  }

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "16px 20px", fontSize: 14, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
            style={{ paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", width: 200 }} />
        </div>
        <div style={{ flex: 1 }} />
        <select value={type} onChange={e => setType(e.target.value)}
          style={{ padding: "9px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", cursor: "pointer" }}>
          {PROMPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={() => router.push("/admin/performance/conversations/prompts/new")}
          style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Add Prompt
        </button>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              <th style={th}>Description</th>
              <th style={{ ...th, width: 100 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: 48, textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>Loading…</td></tr>
            ) : prompts.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 60, textAlign: "center" }}>
                  <Inbox size={36} strokeWidth={1} style={{ color: "var(--border-strong)", display: "block", margin: "0 auto 10px" }} />
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No data</span>
                </td>
              </tr>
            ) : prompts.map(p => (
              <tr key={p.id}>
                <td style={td}>{p.title}</td>
                <td style={td}>{p.description}</td>
                <td style={{ ...td, width: 100 }}>
                  <RowMenu items={[
                    { label: "Edit", action: () => router.push(`/admin/performance/conversations/prompts/${p.id}/edit`) },
                    { label: "Delete", action: () => setDeleteId(p.id), danger: true },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deleteId && typeof window !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div style={{ background: "var(--card)", borderRadius: 12, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Delete Prompt</span>
              <button onClick={() => setDeleteId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.6 }}>Are you sure you want to delete this prompt?</p>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "9px 24px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} style={{ padding: "9px 24px", background: "var(--danger)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ConversationsPage() {
  const [tab, setTab] = useState<Tab>("Rounds")
  return (
    <div>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t ? 700 : 400, color: tab === t ? "var(--primary)" : "var(--muted-foreground)", borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent", marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Rounds"  && <RoundsTab />}
      {tab === "Setup"   && <SetupTab />}
      {tab === "Prompts" && <PromptsTab />}
    </div>
  )
}
