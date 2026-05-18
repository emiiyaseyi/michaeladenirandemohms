"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Button from "@/components/ui/Button"
import Avatar from "@/components/ui/Avatar"
import { ChevronLeft, ChevronDown, ChevronRight, Loader2, UserMinus } from "lucide-react"
import { PERMISSION_GROUPS } from "@/lib/admin-permissions"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

interface Member {
  id: string; assignedAt: string
  user: {
    id: string; name: string | null; email: string | null; isActive: boolean
    employee: { id: string; firstName: string; lastName: string; employeeId: string; jobTitle: string | null; department: { name: string } | null } | null
  }
}

interface RoleDetail {
  id: string; name: string; slug: string; description: string | null; isSystem: boolean
  permissions: Record<string, boolean>; createdAt: string; members: Member[]
}

export default function RoleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [role, setRole] = useState<RoleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  // Edit state (custom roles only)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/settings/roles/${id}`)
    const d = await r.json()
    if (d.role) {
      setRole(d.role)
      setEditName(d.role.name)
      setEditDescription(d.role.description ?? "")
      setEditPermissions(d.role.permissions ?? {})
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const toggleGroup = (group: string) => {
    setExpandedGroups(gs => gs.includes(group) ? gs.filter(g => g !== group) : [...gs, group])
  }

  const toggleGroupAll = (keys: string[]) => {
    if (role?.isSystem) return
    const allOn = keys.every(k => editPermissions[k])
    const updated = { ...editPermissions }
    keys.forEach(k => { if (allOn) delete updated[k]; else updated[k] = true })
    setEditPermissions(updated)
  }

  const togglePerm = (key: string) => {
    if (role?.isSystem) return
    setEditPermissions(p => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = true; return n })
  }

  const save = async () => {
    if (!role || role.isSystem) return
    setSaving(true); setError("")
    const r = await fetch(`/api/settings/roles/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDescription, permissions: editPermissions }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to save"); return }
    router.push("/admin/settings/roles-permissions")
  }

  const removeMember = async (userId: string) => {
    if (!role) return
    setRemovingMember(userId)
    await fetch(`/api/settings/roles/${id}/members`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    setRemovingMember(null)
    load()
  }

  if (loading || !role) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
        <Loader2 size={20} style={{ animation: "spin .8s linear infinite" }} />
        <span style={{ fontSize: 14 }}>Loading…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const isEditable = !role.isSystem
  const activePermCount = Object.values(editPermissions).filter(Boolean).length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={() => router.push("/admin/settings/roles-permissions")} style={{ background: "var(--muted)", border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "var(--foreground)", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{role.name}</h1>
            {role.isSystem && <span style={{ fontSize: 10, background: "var(--primary)", color: "white", borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>SYSTEM</span>}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
            {isEditable ? "Edit permissions and details for this custom role." : "View permissions for this system role."}
          </p>
        </div>
      </div>

      {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        {/* Left: Info + Members */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", padding: 20 }}>
            {isEditable ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label style={lbl}>Role name *</label><input value={editName} onChange={e => setEditName(e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Description</label><textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} /></div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {role.description && <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.6 }}>{role.description}</p>}
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                  <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{activePermCount}</span> permissions enabled
                </div>
              </div>
            )}
          </div>

          {/* Members */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Members</span>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>{role.members.length}</span>
            </div>
            {role.members.length === 0 ? (
              <div style={{ padding: "20px 16px", fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>No members assigned</div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {role.members.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                    <Avatar name={m.user.name ?? m.user.email ?? "?"} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.user.name ?? "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.user.employee?.employeeId ?? m.user.email}</div>
                    </div>
                    <button
                      onClick={() => removeMember(m.user.id)}
                      disabled={removingMember === m.user.id}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2, display: "flex", alignItems: "center", opacity: removingMember === m.user.id ? 0.5 : 1 }}
                      title="Remove from role"
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Permission Accordion */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Permissions</span>
            {isEditable && <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{activePermCount} selected</span>}
          </div>

          <div>
            {PERMISSION_GROUPS.map(grp => {
              const keys = grp.items.map(i => i.key)
              const enabledCount = keys.filter(k => editPermissions[k]).length
              const allOn = keys.every(k => editPermissions[k])
              const expanded = expandedGroups.includes(grp.group)

              return (
                <div key={grp.group} style={{ borderBottom: "1px solid var(--border)" }}>
                  <div
                    onClick={() => toggleGroup(grp.group)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", cursor: "pointer", userSelect: "none" }}
                  >
                    {isEditable && (
                      <input
                        type="checkbox"
                        checked={allOn}
                        onClick={e => e.stopPropagation()}
                        onChange={() => toggleGroupAll(keys)}
                        style={{ width: 14, height: 14, flexShrink: 0 }}
                      />
                    )}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{grp.group}</span>
                    {enabledCount > 0 && <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>{enabledCount}/{grp.items.length}</span>}
                    {expanded ? <ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} /> : <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />}
                  </div>
                  {expanded && (
                    <div style={{ padding: "4px 20px 14px", background: "var(--background)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,220px),1fr))", gap: 4 }}>
                        {grp.items.map(item => {
                          const on = !!editPermissions[item.key]
                          return (
                            <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`, background: on ? "var(--muted)" : "transparent", cursor: isEditable ? "pointer" : "default" }}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => togglePerm(item.key)}
                                disabled={!isEditable}
                                style={{ width: 13, height: 13, flexShrink: 0 }}
                              />
                              <span style={{ fontSize: 12, fontWeight: on ? 600 : 400 }}>{item.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {isEditable && (
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" onClick={() => router.push("/admin/settings/roles-permissions")}>Cancel</Button>
              <Button disabled={saving || !editName.trim()} loading={saving} onClick={save}>Save Changes</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
