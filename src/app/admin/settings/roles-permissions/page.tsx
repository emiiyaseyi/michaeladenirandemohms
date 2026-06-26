"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Button from "@/components/ui/Button"
import Avatar from "@/components/ui/Avatar"
import Modal from "@/components/ui/Modal"
import { Plus, MoreHorizontal, Users, Eye, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}

interface RoleRecord {
  id: string; name: string; slug: string; description: string | null; isSystem: boolean
  _count: { members: number }
}

interface AdminRecord {
  id: string; name: string | null; email: string | null; role: string
  employee: { employeeId: string; department: { name: string } | null } | null
  adminRoles: { adminRole: { id: string } }[]
}

export default function RolesPermissionsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"system" | "custom">("system")
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Assign Members modal
  const [assignRole, setAssignRole] = useState<RoleRecord | null>(null)
  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [memberSearch, setMemberSearch] = useState("")
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [savingMembers, setSavingMembers] = useState(false)

  // Delete confirmation
  const [deleteRole, setDeleteRole] = useState<RoleRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/settings/roles")
    const d = await r.json()
    setRoles(d.roles ?? [])
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

  const openAssign = async (role: RoleRecord) => {
    setAssignRole(role); setMenuOpen(null); setSelectedMemberIds([])
    const r = await fetch("/api/settings/admins")
    const d = await r.json()
    setAdmins(d.admins ?? [])
  }

  const saveMembers = async () => {
    if (!assignRole || selectedMemberIds.length === 0) return
    setSavingMembers(true)
    await fetch(`/api/settings/roles/${assignRole.id}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: selectedMemberIds }),
    })
    setSavingMembers(false); setAssignRole(null); load()
  }

  const confirmDelete = async () => {
    if (!deleteRole) return
    setDeleting(true)
    await fetch(`/api/settings/roles/${deleteRole.id}`, { method: "DELETE" })
    setDeleting(false); setDeleteRole(null); load()
  }

  const systemRoles = roles.filter(r => r.isSystem)
  const customRoles = roles.filter(r => !r.isSystem)

  const filteredAdmins = admins.filter(a => {
    if (!memberSearch) return true
    const q = memberSearch.toLowerCase()
    return (a.name ?? "").toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q)
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Roles & Permissions</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "3px 0 0" }}>Manage system and custom roles and their permissions.</p>
        </div>
        {tab === "custom" && (
          <Button size="sm" onClick={() => router.push("/admin/settings/roles-permissions/new")}>
            <Plus size={14} /> Create Custom Role
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex" }}>
        {(["system", "custom"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? "var(--primary)" : "var(--muted-foreground)", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t ? "var(--primary)" : "transparent"}`, cursor: "pointer", marginBottom: -1, transition: "color .15s" }}>
            {t === "system" ? "System Roles" : "Custom Roles"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
        {loading ? (
          <div style={{ padding: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
            <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /><span style={{ fontSize: 13 }}>Loading…</span>
          </div>
        ) : tab === "system" ? (
          <SystemRolesTable roles={systemRoles} onAssign={openAssign} onView={r => router.push(`/admin/settings/roles-permissions/${r.id}`)} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef} />
        ) : (
          <CustomRolesTable roles={customRoles} onAssign={openAssign} onView={r => router.push(`/admin/settings/roles-permissions/${r.id}`)} onEdit={r => router.push(`/admin/settings/roles-permissions/${r.id}`)} onDelete={r => { setDeleteRole(r); setMenuOpen(null) }} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef} />
        )}
      </div>

      {/* Assign Members Modal */}
      <Modal open={!!assignRole} onClose={() => setAssignRole(null)} title={`Assign Members - ${assignRole?.name}`} width={480}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <input placeholder="Search admins…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} style={inp} />
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>Only elevated staff and the Primary Admin can be assigned roles.</p>
          {filteredAdmins.length === 0 ? (
            <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>No admins found</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
              {filteredAdmins.map(a => {
                const sel = selectedMemberIds.includes(a.id)
                return (
                  <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${sel ? "var(--primary)" : "var(--border)"}`, background: sel ? "var(--muted)" : "transparent", cursor: "pointer" }}>
                    <input type="checkbox" checked={sel} onChange={() => setSelectedMemberIds(ids => sel ? ids.filter(id => id !== a.id) : [...ids, a.id])} style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <Avatar name={a.name ?? a.email ?? "?"} size={28} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name ?? "-"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{a.email}</div>
                    </div>
                    {a.role === "SUPER_ADMIN" && <span style={{ fontSize: 10, background: "var(--primary)", color: "white", borderRadius: 999, padding: "2px 7px", fontWeight: 700 }}>Primary</span>}
                  </label>
                )
              })}
            </div>
          )}
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setAssignRole(null)}>Cancel</Button>
          <Button disabled={savingMembers || selectedMemberIds.length === 0} loading={savingMembers} onClick={saveMembers}>
            Assign {selectedMemberIds.length > 0 ? `(${selectedMemberIds.length})` : ""}
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteRole} onClose={() => setDeleteRole(null)} title="Delete Custom Role" width={420}>
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Delete <strong>{deleteRole?.name}</strong>? This will remove the role from all assigned members. This cannot be undone.
          </p>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteRole(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>Delete Role</Button>
        </div>
      </Modal>
    </div>
  )
}

function SystemRolesTable({ roles, onAssign, onView, menuOpen, setMenuOpen, menuRef }: {
  roles: RoleRecord[]; onAssign: (r: RoleRecord) => void; onView: (r: RoleRecord) => void
  menuOpen: string | null; setMenuOpen: (id: string | null) => void; menuRef: React.RefObject<HTMLDivElement | null>
}) {
  if (roles.length === 0) return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
      No system roles found.
    </div>
  )
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Role", "Description", "Members", ""].map(h => (
              <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map(role => (
            <tr key={role.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "14px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ShieldCheck size={15} style={{ color: "var(--primary)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{role.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>System role</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted-foreground)", maxWidth: 280 }}>{role.description ?? "-"}</td>
              <td style={{ padding: "14px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{role._count.members}</span>
                  <button onClick={() => onAssign(role)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                    <Users size={12} /> Assign members
                  </button>
                </div>
              </td>
              <td style={{ padding: "14px 20px" }}>
                <div style={{ position: "relative" }} ref={menuOpen === role.id ? menuRef as React.RefObject<HTMLDivElement> : undefined}>
                  <button onClick={() => setMenuOpen(menuOpen === role.id ? null : role.id)} style={{ background: "var(--muted)", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "var(--foreground)" }}>
                    <MoreHorizontal size={15} />
                  </button>
                  {menuOpen === role.id && (
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50 }}>
                      <button onClick={() => onView(role)} style={{ width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none", fontSize: 13, cursor: "pointer", color: "var(--foreground)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                        <Eye size={13} /> View
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CustomRolesTable({ roles, onAssign, onView, onEdit, onDelete, menuOpen, setMenuOpen, menuRef }: {
  roles: RoleRecord[]; onAssign: (r: RoleRecord) => void; onView: (r: RoleRecord) => void
  onEdit: (r: RoleRecord) => void; onDelete: (r: RoleRecord) => void
  menuOpen: string | null; setMenuOpen: (id: string | null) => void; menuRef: React.RefObject<HTMLDivElement | null>
}) {
  if (roles.length === 0) return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
      No custom roles yet. Create one to get started.
    </div>
  )
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Role", "Description", "Members", ""].map(h => (
              <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map(role => (
            <tr key={role.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "14px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ShieldCheck size={15} style={{ color: "var(--muted-foreground)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{role.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Custom role</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted-foreground)", maxWidth: 280 }}>{role.description ?? "-"}</td>
              <td style={{ padding: "14px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{role._count.members}</span>
                  <button onClick={() => onAssign(role)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                    <Users size={12} /> Assign members
                  </button>
                </div>
              </td>
              <td style={{ padding: "14px 20px" }}>
                <div style={{ position: "relative" }} ref={menuOpen === role.id ? menuRef as React.RefObject<HTMLDivElement> : undefined}>
                  <button onClick={() => setMenuOpen(menuOpen === role.id ? null : role.id)} style={{ background: "var(--muted)", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "var(--foreground)" }}>
                    <MoreHorizontal size={15} />
                  </button>
                  {menuOpen === role.id && (
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50 }}>
                      <button onClick={() => onView(role)} style={{ width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none", fontSize: 13, cursor: "pointer", color: "var(--foreground)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><Eye size={13} /> View</button>
                      <button onClick={() => onEdit(role)} style={{ width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none", fontSize: 13, cursor: "pointer", color: "var(--foreground)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><Pencil size={13} /> Edit</button>
                      <div style={{ height: 1, background: "var(--border)" }} />
                      <button onClick={() => onDelete(role)} style={{ width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none", fontSize: 13, cursor: "pointer", color: "var(--danger)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><Trash2 size={13} /> Delete</button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
