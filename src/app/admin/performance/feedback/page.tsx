"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Avatar from "@/components/ui/Avatar"
import { formatDate } from "@/lib/utils"
import { Inbox, ChevronDown, X } from "lucide-react"

const FEEDBACK_TYPE_LABEL: Record<string, string> = {
  PEER: "Peer",
  MANAGER: "Manager",
  SELF: "Self",
  THREE_SIXTY: "360°",
  KUDOS: "Kudos",
}

// ─── Employee multi-select dropdown ─────────────────────────────────────────
function EmployeeFilter({
  employees,
  selected,
  onChange,
}: {
  employees: any[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(v => !v)
    if (!open) setSearch("")
  }

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const filtered = employees.filter(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase())
  )

  const toggleId = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", border: `1px solid ${open ? "var(--primary)" : "var(--border)"}`,
          borderRadius: 8, background: "var(--card)", cursor: "pointer",
          fontSize: 13, color: "var(--foreground)", minWidth: 120,
          outline: "none",
        }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{selected.length}</span>
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 240),
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employees…"
              style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>No employees found</div>
            ) : filtered.map(e => {
              const sel = selected.includes(e.id)
              return (
                <button
                  key={e.id}
                  onClick={() => toggleId(e.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "9px 14px", background: sel ? "var(--primary-50, #f0fdf4)" : "none",
                    border: "none", cursor: "pointer", fontSize: 13,
                    color: sel ? "var(--primary)" : "var(--foreground)", textAlign: "left",
                  }}
                  onMouseEnter={ev => { if (!sel) (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                  onMouseLeave={ev => { if (!sel) (ev.currentTarget as HTMLElement).style.background = "none" }}
                >
                  {e.firstName} {e.lastName}
                  {sel && <X size={12} />}
                </button>
              )
            })}
          </div>
          {selected.length > 0 && (
            <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => onChange([])}
                style={{ fontSize: 12, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Simple portal dropdown ──────────────────────────────────────────────────
function SimpleDropdown({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const label = options.find(o => o.value === value)?.label ?? value

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
          border: `1px solid ${open ? "var(--primary)" : "var(--border)"}`,
          borderRadius: 8, background: "var(--card)", cursor: "pointer",
          fontSize: 13, color: "var(--foreground)", minWidth: 110, outline: "none",
        }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 140),
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden",
          }}
        >
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                display: "block", width: "100%", padding: "10px 16px",
                background: o.value === value ? "var(--primary-50, #f0fdf4)" : "none",
                border: "none", cursor: "pointer", fontSize: 13,
                color: o.value === value ? "var(--primary)" : "var(--foreground)",
                textAlign: "left", fontWeight: o.value === value ? 600 : 400,
              }}
              onMouseEnter={ev => { if (o.value !== value) (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
              onMouseLeave={ev => { if (o.value !== value) (ev.currentTarget as HTMLElement).style.background = "none" }}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function NoData() {
  return (
    <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
      <Inbox size={40} style={{ margin: "0 auto 12px", strokeWidth: 1.5, opacity: 0.4 }} />
      <div style={{ fontSize: 13 }}>No data</div>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em",
  background: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
}
const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

// ─── Feedback tab ────────────────────────────────────────────────────────────
function FeedbackTab({ employees }: { employees: any[] }) {
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])
  const [direction, setDirection] = useState("given")

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ direction })
    selectedEmpIds.forEach(id => params.append("employeeId", id))
    fetch(`/api/performance/feedback?${params}`)
      .then(r => r.json())
      .then(d => { setFeedbacks(d.feedbacks ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedEmpIds, direction])

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
        <EmployeeFilter employees={employees} selected={selectedEmpIds} onChange={setSelectedEmpIds} />
        <SimpleDropdown
          value={direction}
          options={[{ value: "given", label: "Given" }, { value: "received", label: "Received" }]}
          onChange={setDirection}
        />
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : feedbacks.length === 0 ? (
          <NoData />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Employee</th>
                <th style={th}>Reviewee</th>
                <th style={th}>Date</th>
                <th style={th}>Feedback</th>
                <th style={th}>Type</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f: any) => (
                <tr key={f.id}
                  style={{ cursor: "default" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                >
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={`${f.giver.firstName} ${f.giver.lastName}`} photo={f.giver.profilePhoto} size={32} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{f.giver.firstName} {f.giver.lastName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{f.giver.jobTitle ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={`${f.receiver.firstName} ${f.receiver.lastName}`} photo={f.receiver.profilePhoto} size={32} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{f.receiver.firstName} {f.receiver.lastName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{f.receiver.jobTitle ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{formatDate(f.createdAt)}</td>
                  <td style={{ ...td, maxWidth: 320 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: f.comment ? "var(--foreground)" : "var(--muted-foreground)" }}>
                      {f.comment ?? "—"}
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)" }}>
                      {FEEDBACK_TYPE_LABEL[f.type] ?? f.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Requests tab ────────────────────────────────────────────────────────────
function RequestsTab({ employees }: { employees: any[] }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])
  const [direction, setDirection] = useState("requested")

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ direction })
    selectedEmpIds.forEach(id => params.append("employeeId", id))
    fetch(`/api/performance/feedback/requests?${params}`)
      .then(r => r.json())
      .then(d => { setRequests(d.requests ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedEmpIds, direction])

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
        <EmployeeFilter employees={employees} selected={selectedEmpIds} onChange={setSelectedEmpIds} />
        <SimpleDropdown
          value={direction}
          options={[{ value: "requested", label: "Requested" }, { value: "received", label: "Received" }]}
          onChange={setDirection}
        />
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : requests.length === 0 ? (
          <NoData />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Employee</th>
                <th style={th}>Request From</th>
                <th style={th}>Date</th>
                <th style={th}>Request</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                >
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={`${r.requester.firstName} ${r.requester.lastName}`} photo={r.requester.profilePhoto} size={32} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.requester.firstName} {r.requester.lastName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{r.requester.jobTitle ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={`${r.target.firstName} ${r.target.lastName}`} photo={r.target.profilePhoto} size={32} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.target.firstName} {r.target.lastName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{r.target.jobTitle ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{formatDate(r.createdAt)}</td>
                  <td style={{ ...td, maxWidth: 360 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: r.message ? "var(--foreground)" : "var(--muted-foreground)" }}>
                      {r.message ?? "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FeedbackPage() {
  const [tab, setTab] = useState<"feedback" | "requests">("feedback")
  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/employees?limit=500")
      .then(r => r.json())
      .then(d => setEmployees((d.employees ?? []).sort((a: any, b: any) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      )))
  }, [])

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px",
    marginRight: 24,
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    color: active ? "var(--primary)" : "var(--muted-foreground)",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
    cursor: "pointer",
    transition: "color .15s",
  })

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Feedback</h1>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
        <button style={tabStyle(tab === "feedback")} onClick={() => setTab("feedback")}>Feedback</button>
        <button style={tabStyle(tab === "requests")} onClick={() => setTab("requests")}>Requests</button>
      </div>

      {tab === "feedback" && <FeedbackTab employees={employees} />}
      {tab === "requests" && <RequestsTab employees={employees} />}
    </div>
  )
}
