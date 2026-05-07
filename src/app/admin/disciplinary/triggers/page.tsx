"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Search, Inbox, ChevronDown } from "lucide-react"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import { formatDate } from "@/lib/utils"

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
]

function StatusDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const label = STATUS_OPTIONS.find(o => o.value === value)?.label ?? "All"

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: `1px solid ${open ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, color: "var(--foreground)", outline: "none", minWidth: 140 }}>
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 160), background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              style={{ display: "block", width: "100%", padding: "10px 16px", background: o.value === value ? "var(--primary-50, #f0fdf4)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: o.value === value ? "var(--primary)" : "var(--foreground)", textAlign: "left", fontWeight: o.value === value ? 600 : 400 }}
              onMouseEnter={ev => { if (o.value !== value) (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
              onMouseLeave={ev => { if (o.value !== value) (ev.currentTarget as HTMLElement).style.background = "none" }}>
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }
const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

export default function DisciplinaryTriggersPage() {
  const [triggers, setTriggers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("PENDING_REVIEW")

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ status })
    if (search) p.set("search", search)
    fetch(`/api/disciplinary/triggers?${p}`)
      .then(r => r.json())
      .then(d => { setTriggers(d.triggers ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, status])

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", width: 220 }} />
        </div>
        <StatusDropdown value={status} onChange={setStatus} />
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--muted)" }}>
              <th style={th}>Employee</th>
              <th style={th}>Action</th>
              <th style={th}>Description</th>
              <th style={th}>Trigger Date</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</td></tr>
            ) : triggers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
                    <Inbox size={40} style={{ margin: "0 auto 12px", strokeWidth: 1.5, opacity: 0.4 }} />
                    <div style={{ fontSize: 13 }}>No data</div>
                  </div>
                </td>
              </tr>
            ) : triggers.map(t => (
              <tr key={t.id}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={`${t.employee.firstName} ${t.employee.lastName}`} photo={t.employee.profilePhoto} size={32} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.employee.firstName} {t.employee.lastName}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{t.employee.jobTitle ?? "—"}</div>
                    </div>
                  </div>
                </td>
                <td style={td}>{t.action}</td>
                <td style={{ ...td, maxWidth: 260 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.description ? "var(--foreground)" : "var(--muted-foreground)" }}>
                    {t.description ?? "—"}
                  </div>
                </td>
                <td style={{ ...td, color: "var(--muted-foreground)" }}>{formatDate(t.triggerDate)}</td>
                <td style={td}><Badge status={t.status} /></td>
                <td style={td}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
