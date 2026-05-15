"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Building2, Search, ChevronDown, MoreVertical, Inbox } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

interface Contractor {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  industry?: string | null
  currency?: string | null
  isActive: boolean
}

const CURRENCY_FLAGS: Record<string, string> = {
  NGN: "🇳🇬", USD: "🇺🇸", GBP: "🇬🇧", EUR: "🇪🇺", GHS: "🇬🇭", KES: "🇰🇪",
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: active ? "var(--success-bg)" : "var(--muted)",
      color: active ? "var(--success)" : "var(--muted-foreground)",
    }}>
      {active ? "Active" : "Inactive"}
    </span>
  )
}

function RowMenu({ onView, onEdit, onDelete, canManage }: { onView: () => void; onEdit: () => void; onDelete: () => void; canManage: boolean }) {
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
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 9999, minWidth: 130, overflow: "hidden" }}>
          {[
            { label: "View", action: () => { setOpen(false); onView() }, danger: false },
            ...(canManage ? [{ label: "Edit", action: () => { setOpen(false); onEdit() }, danger: false }] : []),
            ...(canManage ? [{ label: "Delete", action: () => { setOpen(false); onDelete() }, danger: true }] : []),
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: item.danger ? "var(--danger)" : "var(--foreground)" }}
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

export default function ContractorsPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const canManageContractors = user?.can("canManageContractors") ?? false
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("")
  const [showStatusDrop, setShowStatusDrop] = useState(false)
  const [showManageDrop, setShowManageDrop] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const manageRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (search) params.set("search", search)
    const r = await fetch(`/api/contractors?${params}`)
    const d = await r.json()
    setContractors(d.contractors ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatusDrop(false)
      if (manageRef.current && !manageRef.current.contains(e.target as Node)) setShowManageDrop(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const deleteContractor = async (id: string) => {
    if (!confirm("Delete this contractor?")) return
    await fetch(`/api/contractors/${id}`, { method: "DELETE" })
    setContractors(cs => cs.filter(c => c.id !== id))
  }

  const downloadCSV = () => {
    const rows = [["Name", "Email", "Phone", "Currency", "Industry", "Status"]]
    contractors.forEach(c => rows.push([c.name, c.email ?? "", c.phone ?? "", c.currency ?? "", c.industry ?? "", c.isActive ? "Active" : "Inactive"]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "contractors.csv"; a.click()
  }

  const statusLabel = statusFilter === "active" ? "Active" : statusFilter === "inactive" ? "Inactive" : "Status"

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search contractors…"
            style={{ paddingLeft: 32, padding: "8px 14px 8px 32px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", width: 260 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Status filter */}
          <div ref={statusRef} style={{ position: "relative" }}>
            <button onClick={() => setShowStatusDrop(v => !v)} style={{ padding: "8px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)" }}>
              {statusLabel} <ChevronDown size={13} />
            </button>
            {showStatusDrop && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 100, minWidth: 130 }}>
                {([["", "All"], ["active", "Active"], ["inactive", "Inactive"]] as const).map(([v, l]) => (
                  <button key={v} onClick={() => { setStatusFilter(v); setShowStatusDrop(false) }} style={{ display: "block", width: "100%", padding: "9px 16px", background: statusFilter === v ? "var(--muted)" : "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--foreground)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                    onMouseLeave={e => (e.currentTarget.style.background = statusFilter === v ? "var(--muted)" : "none")}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manage dropdown */}
          {canManageContractors && (
            <div ref={manageRef} style={{ position: "relative" }}>
              <button onClick={() => setShowManageDrop(v => !v)} style={{ padding: "8px 16px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                Manage <ChevronDown size={13} />
              </button>
              {showManageDrop && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 100, minWidth: 210 }}>
                  {[
                    { label: "Add new Contractor", action: () => router.push("/admin/contractors/new") },
                    { label: "Bulk update Contractors", action: () => router.push("/admin/contractors/bulk-update") },
                    { label: "Bulk upload Contractors", action: () => router.push("/admin/contractors/bulk-upload") },
                    { label: "Download CSV", action: downloadCSV },
                  ].map(item => (
                    <button key={item.label} onClick={() => { setShowManageDrop(false); item.action() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--foreground)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.5fr 1.5fr 1fr 48px", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
          {["Contractor", "Email", "Currency", "Contact", "Industry", "Status", ""].map(h => (
            <span key={h} style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : contractors.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Inbox size={36} strokeWidth={1} style={{ color: "var(--border-strong)", display: "block", margin: "0 auto 12px" }} />
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No contractors found</span>
          </div>
        ) : contractors.map(c => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.5fr 1.5fr 1fr 48px", padding: "14px 20px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Building2 size={16} color="var(--primary)" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{c.name}</span>
            </div>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{c.email ?? "—"}</span>
            <span style={{ fontSize: 13, color: "var(--foreground)" }}>
              {c.currency ? `${CURRENCY_FLAGS[c.currency] ?? ""} ${c.currency}` : "—"}
            </span>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{c.phone ?? "—"}</span>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{c.industry ?? "—"}</span>
            <StatusBadge active={c.isActive} />
            <RowMenu
              onView={() => router.push(`/admin/contractors/${c.id}`)}
              onEdit={() => router.push(`/admin/contractors/${c.id}/edit`)}
              onDelete={() => deleteContractor(c.id)}
              canManage={canManageContractors}
            />
          </div>
        ))}
      </div>

      {!loading && contractors.length > 0 && (
        <div style={{ padding: "12px 0", textAlign: "right", fontSize: 13, color: "var(--muted-foreground)" }}>
          {contractors.length} contractor{contractors.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}
