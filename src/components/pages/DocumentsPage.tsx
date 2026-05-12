"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import ReactDOM from "react-dom"
import { ChevronDown, ChevronUp, MoreHorizontal, FileText, Plus } from "lucide-react"

function PdfFileIcon() {
  return (
    <svg width="44" height="52" viewBox="0 0 44 52" fill="none" style={{ flexShrink: 0 }}>
      <rect x="0" y="0" width="38" height="48" rx="5" fill="var(--danger-bg)" />
      <rect x="5" y="8" width="20" height="2.5" rx="1.25" fill="var(--accent-100)" />
      <rect x="5" y="14" width="20" height="2.5" rx="1.25" fill="var(--accent-100)" />
      <rect x="5" y="20" width="14" height="2.5" rx="1.25" fill="var(--accent-100)" />
      <rect x="0" y="34" width="44" height="18" rx="5" fill="var(--danger)" />
      <text x="9" y="47" fontSize="11" fontWeight="bold" fill="white" fontFamily="Arial, sans-serif">PDF</text>
    </svg>
  )
}

function TemplateIcon() {
  return (
    <div style={{ width: 36, height: 36, background: "#EDE9FE", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <FileText size={18} color="#7C3AED" />
    </div>
  )
}

function DraftBadge() {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--warning)", color: "var(--warning)", background: "var(--card)" }}>Draft</span>
  )
}

function DeletedBadge() {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "var(--danger)", color: "white" }}>Deleted</span>
  )
}

interface MenuState {
  id: string
  type: "template" | "doc-active" | "doc-deleted"
  top: number
  right: number
}

export default function DocumentsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const base = pathname?.startsWith("/project-lead") ? "/project-lead" : pathname?.startsWith("/staff") ? "/staff" : "/admin"
  const [tab, setTab] = useState<"employee" | "company">("employee")
  const [offerOpen, setOfferOpen] = useState(false)
  const [empDocsOpen, setEmpDocsOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [empDocs, setEmpDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [tr, dr] = await Promise.all([
      fetch("/api/offer-templates").then(r => r.json()),
      fetch("/api/documents?all=true").then(r => r.json()),
    ])
    setTemplates(tr.templates ?? [])
    setEmpDocs(dr.docs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!menu) return
    const h = () => setMenu(null)
    window.addEventListener("click", h)
    return () => window.removeEventListener("click", h)
  }, [menu])

  const openMenu = (e: React.MouseEvent, id: string, type: MenuState["type"]) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ id, type, top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }

  const finishTemplate = (id: string) => router.push(`${base}/documents/offer-template/${id}/edit`)
  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this offer template?")) return
    await fetch(`/api/offer-templates/${id}`, { method: "DELETE" })
    setTemplates(ts => ts.filter(t => t.id !== id))
    setMenu(null)
  }

  const viewDoc = (id: string) => router.push(`${base}/documents/${id}`)
  const softDeleteDoc = async (id: string) => {
    if (!confirm("Delete this document? It will be hidden but can be restored later.")) return
    await fetch(`/api/documents/${id}`, { method: "DELETE" })
    setEmpDocs(docs => docs.map(d => d.id === id ? { ...d, isActive: false } : d))
    setMenu(null)
  }
  const removeDocPermanent = async (id: string) => {
    if (!confirm("Permanently remove this document? This cannot be undone.")) return
    await fetch(`/api/documents/${id}?permanent=true`, { method: "DELETE" })
    setEmpDocs(docs => docs.filter(d => d.id !== id))
    setMenu(null)
  }
  const restoreDoc = async (id: string) => {
    await fetch(`/api/documents/${id}/restore`, { method: "POST" })
    setEmpDocs(docs => docs.map(d => d.id === id ? { ...d, isActive: true } : d))
    setMenu(null)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 15,
    fontWeight: active ? 700 : 500,
    color: active ? "var(--primary)" : "var(--muted-foreground)",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? "var(--primary)" : "transparent"}`,
    padding: "10px 4px",
    cursor: "pointer",
    marginRight: 24,
  })

  const sectionHeader = (title: string, desc: string, open: boolean, onToggle: () => void) => (
    <div
      onClick={onToggle}
      style={{ padding: "20px 24px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", userSelect: "none" }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--muted-foreground)", maxWidth: 700 }}>{desc}</div>
      </div>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 16 }}>
        {open ? <ChevronUp size={16} color="var(--muted-foreground)" /> : <ChevronDown size={16} color="var(--muted-foreground)" />}
      </div>
    </div>
  )

  const menuItems = menu ? (
    menu.type === "template"
      ? [
          { label: "Finish", onClick: () => { finishTemplate(menu.id); setMenu(null) } },
          { label: "Delete", onClick: () => deleteTemplate(menu.id), danger: true },
        ]
      : menu.type === "doc-active"
        ? [
            { label: "View", onClick: () => { viewDoc(menu.id); setMenu(null) } },
            { label: "Delete", onClick: () => softDeleteDoc(menu.id), danger: true },
          ]
        : [
            { label: "Remove", onClick: () => removeDocPermanent(menu.id), danger: true },
            { label: "Restore", onClick: () => restoreDoc(menu.id) },
          ]
  ) : []

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
        <div style={{ display: "flex" }}>
          <button style={tabStyle(tab === "employee")} onClick={() => setTab("employee")}>Employee</button>
          <button style={tabStyle(tab === "company")} onClick={() => setTab("company")}>Company</button>
        </div>
        <button
          onClick={() => router.push(`${base}/documents/new`)}
          style={{ padding: "10px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          Create new document
        </button>
      </div>

      {tab === "employee" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "visible" }}>
            {sectionHeader(
              "Offer Templates",
              "Invite someone to join your company with a legally binding document that includes terms of employment, compensation, and more.",
              offerOpen,
              () => setOfferOpen(o => !o)
            )}
            {offerOpen && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                {loading ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Loading…</div>
                ) : templates.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>No offer templates yet.</div>
                ) : templates.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)" }}>
                    <TemplateIcon />
                    <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>{t.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {t.status === "DRAFT" && <DraftBadge />}
                      <button
                        onClick={e => openMenu(e, t.id, "template")}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "visible" }}>
            {sectionHeader(
              "Employee Documents",
              "This is a list of documents that new hires can fill out and sign online. You can upload a document that you want to send to current or future employees here.",
              empDocsOpen,
              () => setEmpDocsOpen(o => !o)
            )}
            {empDocsOpen && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                {loading ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Loading…</div>
                ) : empDocs.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>No employee documents yet.</div>
                ) : empDocs.map(doc => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)" }}>
                    <PdfFileIcon />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>{doc.title}</div>
                      {doc.description && <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{doc.description}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {!doc.isActive && <DeletedBadge />}
                      <button
                        onClick={e => openMenu(e, doc.id, doc.isActive ? "doc-active" : "doc-deleted")}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "company" && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <FileText size={40} color="var(--border-strong)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Company documents</div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Company-wide documents will appear here.</div>
        </div>
      )}

      {mounted && menu && ReactDOM.createPortal(
        <div
          style={{ position: "fixed", top: menu.top, right: menu.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 9999, minWidth: 140, overflow: "hidden" }}
          onClick={e => e.stopPropagation()}
        >
          {menuItems.map(item => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: (item as any).danger ? "var(--danger)" : "var(--foreground)", fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
