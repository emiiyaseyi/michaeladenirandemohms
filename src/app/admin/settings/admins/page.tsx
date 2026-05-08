"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Button from "@/components/ui/Button"
import Avatar from "@/components/ui/Avatar"
import Modal from "@/components/ui/Modal"
import { Plus, MoreHorizontal, Loader2, ShieldCheck } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}

interface AdminRole {
  id: string; name: string; slug: string; isSystem: boolean
}

interface AdminRecord {
  id: string
  name: string | null
  email: string | null
  role: string
  isActive: boolean
  createdAt: string
  employee: { id: string; firstName: string; lastName: string; employeeId: string; jobTitle: string | null; department: { id: string; name: string } | null } | null
  adminRoles: { id: string; assignedAt: string; adminRole: AdminRole }[]
}

export default function AdminsSettingsPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [allRoles, setAllRoles] = useState<AdminRole[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editAdmin, setEditAdmin] = useState<AdminRecord | null>(null)
  const [editRoleIds, setEditRoleIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [removeAdmin, setRemoveAdmin] = useState<AdminRecord | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    const [ra, rr] = await Promise.all([
      fetch("/api/settings/admins").then(r => r.json()),
      fetch("/api/settings/roles").then(r => r.json()),
    ])
    setAdmins(ra.admins ?? [])
    setAllRoles(rr.roles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = admins.filter(a => {
    const q = search.toLowerCase()
    return !q || (a.name ?? "").toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q) ||
      (a.employee?.employeeId ?? "").toLowerCase().includes(q) ||
      (a.employee?.department?.name ?? "").toLowerCase().includes(q)
  })

  const openEdit = (a: AdminRecord) => {
    setEditAdmin(a)
    setEditRoleIds(a.adminRoles.map(ar => ar.adminRole.id))
    setMenuOpen(null)
  }

  const saveRoles = async () => {
    if (!editAdmin) return
    setSaving(true)
    await fetch(`/api/settings/admins/${editAdmin.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds: editRoleIds }),
    })
    setSaving(false); setEditAdmin(null); load()
  }

  const confirmRemove = async () => {
    if (!removeAdmin) return
    setSaving(true)
    await fetch(`/api/settings/admins/${removeAdmin.id}`, { method: "DELETE" })
    setSaving(false); setRemoveAdmin(null); load()
  }

  const superAdmin = filtered.find(a => a.role === "SUPER_ADMIN")
  const elevated = filtered.filter(a => a.role !== "SUPER_ADMIN")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Stats + header */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
        <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,150px),1fr))", gap: 12, borderBottom: "1px solid var(--border)" }}>
          {[
            { label: "Total Admins", value: admins.length, color: "var(--foreground)" },
            { label: "Elevated Staff", value: admins.filter(a => a.role !== "SUPER_ADMIN").length, color: "var(--primary)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + button */}
        <div style={{ padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
          <input placeholder="Search by name, email, ID, dept…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 260 }} />
          <Button size="sm" onClick={() => router.push("/admin/settings/admins/new")}>
            <Plus size={14} /> Create new Admin
          </Button>
        </div>

        {loading ? (
          <div style={{ padding: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
            <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /><span style={{ fontSize: 13 }}>Loading…</span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Admin", "Employee ID", "Roles", ""].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {elevated.map(a => <AdminRow key={a.id} admin={a} onEdit={openEdit} onRemove={ad => { setRemoveAdmin(ad); setMenuOpen(null) }} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef} />)}
                {elevated.length === 0 && !superAdmin && (
                  <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>{search ? "No admins match your search." : "No elevated staff yet."}</td></tr>
                )}
                {superAdmin && <SuperAdminRow admin={superAdmin} />}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Roles Modal */}
      <Modal open={!!editAdmin} onClose={() => setEditAdmin(null)} title={`Edit Roles — ${editAdmin?.name}`} width={500}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>Select which roles this admin should have. At least one role is required.</p>
          {allRoles.map(role => {
            const checked = editRoleIds.includes(role.id)
            return (
              <label key={role.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, border: `1px solid ${checked ? "var(--primary)" : "var(--border)"}`, background: checked ? "var(--muted)" : "transparent", cursor: "pointer" }}>
                <input type="checkbox" checked={checked} onChange={() => setEditRoleIds(ids => checked ? ids.filter(id => id !== role.id) : [...ids, role.id])} style={{ width: 15, height: 15, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{role.name}</div>
                  {role.isSystem && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>System role</div>}
                </div>
              </label>
            )
          })}
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setEditAdmin(null)}>Cancel</Button>
          <Button disabled={saving || editRoleIds.length === 0} loading={saving} onClick={saveRoles}>Save Roles</Button>
        </div>
      </Modal>

      {/* Remove Admin Confirmation */}
      <Modal open={!!removeAdmin} onClose={() => setRemoveAdmin(null)} title="Remove Admin" width={420}>
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0, lineHeight: 1.6 }}>
            Remove <strong>{removeAdmin?.name}</strong> from all admin roles? They will lose all admin access and return to a regular staff account.
          </p>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setRemoveAdmin(null)}>Cancel</Button>
          <Button variant="danger" loading={saving} onClick={confirmRemove}>Remove Admin</Button>
        </div>
      </Modal>
    </div>
  )
}

function AdminRow({ admin, onEdit, onRemove, menuOpen, setMenuOpen, menuRef }: {
  admin: AdminRecord
  onEdit: (a: AdminRecord) => void
  onRemove: (a: AdminRecord) => void
  menuOpen: string | null
  setMenuOpen: (id: string | null) => void
  menuRef: React.RefObject<HTMLDivElement | null>
}) {
  const roles = admin.adminRoles.map(ar => ar.adminRole)
  const shown = roles.slice(0, 2)
  const extra = roles.length - 2

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={admin.name ?? admin.email ?? "?"} size={34} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{admin.name ?? "—"}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{admin.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "14px 20px", fontSize: 13 }}>
        {admin.employee ? (
          <>
            <div>{admin.employee.employeeId}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{admin.employee.department?.name ?? "—"}</div>
          </>
        ) : <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>External</span>}
      </td>
      <td style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {shown.map(r => (
            <span key={r.id} style={{ fontSize: 11, background: "var(--muted)", color: "var(--foreground)", borderRadius: 999, padding: "3px 9px", fontWeight: 600 }}>{r.name}</span>
          ))}
          {extra > 0 && <span style={{ fontSize: 11, color: "var(--muted-foreground)", padding: "3px 0" }}>+{extra} more</span>}
        </div>
      </td>
      <td style={{ padding: "14px 20px" }}>
        <div style={{ position: "relative" }} ref={menuOpen === admin.id ? menuRef as React.RefObject<HTMLDivElement> : undefined}>
          <button onClick={() => setMenuOpen(menuOpen === admin.id ? null : admin.id)} style={{ background: "var(--muted)", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "var(--foreground)" }}>
            <MoreHorizontal size={15} />
          </button>
          {menuOpen === admin.id && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50 }}>
              <button onClick={() => onEdit(admin)} style={{ width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none", fontSize: 13, cursor: "pointer", color: "var(--foreground)", fontWeight: 500 }}>Edit Roles</button>
              <div style={{ height: 1, background: "var(--border)" }} />
              <button onClick={() => onRemove(admin)} style={{ width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none", fontSize: 13, cursor: "pointer", color: "var(--danger)", fontWeight: 500 }}>Remove Admin</button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function SuperAdminRow({ admin }: { admin: AdminRecord }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
      <td style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={admin.name ?? admin.email ?? "?"} size={34} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              {admin.name ?? "—"}
              <span style={{ fontSize: 10, background: "var(--primary)", color: "white", borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>PRIMARY ADMIN</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{admin.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "14px 20px", fontSize: 13 }}>
        {admin.employee ? (
          <>
            <div>{admin.employee.employeeId}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{admin.employee.department?.name ?? "—"}</div>
          </>
        ) : <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>—</span>}
      </td>
      <td style={{ padding: "14px 20px" }}>
        <span style={{ fontSize: 11, background: "var(--primary)", color: "white", borderRadius: 999, padding: "3px 9px", fontWeight: 700 }}>Full Access</span>
      </td>
      <td style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
          <ShieldCheck size={13} /> Primary Admin
        </div>
      </td>
    </tr>
  )
}
