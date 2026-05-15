"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import ReactDOM from "react-dom"
import { X, Search, AlertCircle, MoreHorizontal } from "lucide-react"

function formatDate(s: string | null | undefined) {
  if (!s) return ""
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
  return src ? (
    <img src={src} alt={name} title={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--card)" }} />
  ) : (
    <div title={name} style={{ width: size, height: size, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "var(--muted-foreground)", border: "2px solid var(--card)", flexShrink: 0 }}>
      {initials || "?"}
    </div>
  )
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "8px 18px", border: "1.5px solid var(--border)", background: "var(--card)", borderRadius: 8, fontSize: 14, fontWeight: 500, color: "var(--foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
      onMouseLeave={e => (e.currentTarget.style.background = "var(--card)")}
    >
      <AlertCircle size={14} color="var(--muted-foreground)" />
      {label}
    </button>
  )
}

function RenameModal({ title, onClose, onRename }: { title: string; onClose: () => void; onRename: (t: string) => Promise<void> }) {
  const [val, setVal] = useState(title)
  const [saving, setSaving] = useState(false)
  const save = async () => { setSaving(true); await onRename(val); setSaving(false) }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--card)", borderRadius: 12, width: 480, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)" }}>Edit Employee Document?</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 16 }}>This name change will be applied to documents sent to employees in the future. Existing employee documents will also be modified.</p>
          <label style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            Document name <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input value={val} onChange={e => setVal(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--foreground)", background: "var(--card)", boxSizing: "border-box" }} />
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, fontSize: 14, cursor: "pointer", color: "var(--foreground)" }}>Cancel</button>
          <button onClick={save} disabled={saving || !val.trim()} style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Saving…" : "Rename"}
          </button>
        </div>
      </div>
    </div>
  )
}

function AssignModal({ docId, onClose, onAssigned }: { docId: string; onClose: () => void; onAssigned: () => void }) {
  const [employees, setEmployees] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/employees?status=ACTIVE&limit=200")
      .then(r => r.json())
      .then(d => setEmployees(d.employees ?? d.data ?? []))
  }, [])

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    return `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)
  })

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const assign = async () => {
    if (!selected.length) return
    setSaving(true)
    await fetch(`/api/documents/${docId}/assign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeIds: selected }),
    })
    setSaving(false)
    onAssigned()
    onClose()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--card)", borderRadius: 12, width: 500, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)" }}>Assign Document to Employees</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 12 }}>Search by name and pick who you want to assign this document to.</p>
          <label style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8, display: "block" }}>
            <span style={{ color: "var(--danger)" }}>* </span>Employees
          </label>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Please select"
              style={{ width: "100%", paddingLeft: 32, padding: "9px 12px 9px 32px", border: "1.5px solid var(--primary)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", color: "var(--foreground)", background: "var(--card)" }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {filtered.map(e => (
            <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 24px", cursor: "pointer" }}
              onMouseEnter={ev => (ev.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={ev => (ev.currentTarget.style.background = "none")}>
              <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} style={{ accentColor: "var(--primary)", width: 15, height: 15 }} />
              <span style={{ fontSize: 14, color: "var(--foreground)" }}>{e.firstName} {e.lastName}</span>
            </label>
          ))}
          {filtered.length === 0 && <div style={{ padding: "20px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>No employees found</div>}
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, fontSize: 14, cursor: "pointer", color: "var(--foreground)" }}>Cancel</button>
          <button onClick={assign} disabled={saving || !selected.length} style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Assigning…" : `Assign${selected.length ? ` (${selected.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function RecallModal({ docId, onClose, onRecalled }: { docId: string; onClose: () => void; onRecalled: () => void }) {
  const [saving, setSaving] = useState(false)
  const recall = async (mode: "acknowledged" | "all") => {
    setSaving(true)
    await fetch(`/api/documents/${docId}/recall`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    })
    setSaving(false)
    onRecalled()
    onClose()
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--card)", borderRadius: 12, width: 480, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)" }}>Recall Document</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "24px" }}>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            If you recall this document, it will be removed from employees' profiles and they won't be able to acknowledge it. However, you can still assign it again later.
          </p>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => recall("acknowledged")} disabled={saving} style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Recall only acknowledged
          </button>
          <button onClick={() => recall("all")} disabled={saving} style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Recall all documents
          </button>
        </div>
      </div>
    </div>
  )
}

interface MenuState { top: number; right: number; employeeId: string; fileUrl: string; mimeType?: string }

export default function ViewDocumentPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showRename, setShowRename] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [showRecall, setShowRecall] = useState(false)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/documents/${id}/details`)
    if (r.ok) setData(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (!menu) return
    const h = () => setMenu(null)
    window.addEventListener("click", h)
    return () => window.removeEventListener("click", h)
  }, [menu])

  const openMenu = (e: React.MouseEvent, employeeId: string, fileUrl: string, mimeType?: string) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ top: rect.bottom + 4, right: window.innerWidth - rect.right, employeeId, fileUrl, mimeType })
  }

  const handleRename = async (title: string) => {
    await fetch(`/api/documents/${id}/rename`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    await load()
    setShowRename(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "var(--danger)" }}>Document not found</div>

  const { doc, pending, acknowledged } = data
  const uploadInfo = [
    `Uploaded on ${formatDate(doc.createdAt)}`,
    doc.sentAt ? `Sent to employees on ${formatDate(doc.sentAt)}` : null,
    doc.includeInOnboarding ? "available for new hires" : null,
  ].filter(Boolean).join(" • ")

  const th: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "14px 16px", fontSize: 14, borderBottom: "1px solid var(--border)", color: "var(--foreground)" }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", letterSpacing: "0.03em", margin: 0, textTransform: "uppercase" }}>{doc.title}</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6, marginBottom: 20 }}>{uploadInfo}</p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionBtn label="Preview" onClick={() => window.open(doc.fileUrl, "_blank")} />
          <ActionBtn label="Rename" onClick={() => setShowRename(true)} />
          <ActionBtn label="Assign" onClick={() => setShowAssign(true)} />
          <ActionBtn label="Recall" onClick={() => setShowRecall(true)} />
        </div>
      </div>

      {pending.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 32px", marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 16 }}>People who have not reviewed and acknowledged this document</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {pending.map((a: any) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar src={a.employee?.profilePhoto} name={`${a.employee?.firstName ?? ""} ${a.employee?.lastName ?? ""}`.trim()} />
                <span style={{ fontSize: 13, color: "var(--foreground)" }}>{a.employee?.firstName} {a.employee?.lastName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>People who have reviewed and acknowledged this document</div>
        </div>
        {acknowledged.length === 0 ? (
          <div style={{ padding: "40px 32px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>No one has acknowledged this document yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}><input type="checkbox" /></th>
                  <th style={th}>Employee</th>
                  <th style={th}>Signed on</th>
                  <th style={{ ...th, width: 48 }} />
                </tr>
              </thead>
              <tbody>
                {acknowledged.map((a: any) => (
                  <tr key={a.id}>
                    <td style={{ ...td, width: 48 }}><input type="checkbox" /></td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar src={a.employee?.profilePhoto} name={`${a.employee?.firstName ?? ""} ${a.employee?.lastName ?? ""}`.trim()} />
                        <span style={{ fontWeight: 500 }}>{a.employee?.firstName} {a.employee?.lastName}</span>
                      </div>
                    </td>
                    <td style={{ ...td, color: "var(--muted-foreground)" }}>{formatDate(a.acknowledgedAt)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        onClick={e => openMenu(e, a.employee?.id, doc.fileUrl, doc.mimeType)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4, display: "flex", alignItems: "center" }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "12px 32px", textAlign: "right", fontSize: 13, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
              1–{acknowledged.length} of {acknowledged.length} items
            </div>
          </div>
        )}
      </div>

      {showRename && <RenameModal title={doc.title} onClose={() => setShowRename(false)} onRename={handleRename} />}
      {showAssign && <AssignModal docId={id} onClose={() => setShowAssign(false)} onAssigned={load} />}
      {showRecall && <RecallModal docId={id} onClose={() => setShowRecall(false)} onRecalled={load} />}

      {mounted && menu && ReactDOM.createPortal(
        <div
          style={{ position: "fixed", top: menu.top, right: menu.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 9999, minWidth: 130, overflow: "hidden" }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (menu.mimeType === "application/pdf") window.open(menu.fileUrl, "_blank")
              setMenu(null)
            }}
            style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--foreground)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >View</button>
          <a
            href={menu.fileUrl}
            download
            onClick={() => setMenu(null)}
            style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--foreground)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >Download</a>
        </div>,
        document.body
      )}
    </div>
  )
}
