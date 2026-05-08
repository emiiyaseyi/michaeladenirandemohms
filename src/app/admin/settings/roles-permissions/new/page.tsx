"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@/components/ui/Button"
import { ChevronLeft, ChevronDown, ChevronRight } from "lucide-react"
import { PERMISSION_GROUPS } from "@/lib/admin-permissions"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

export default function NewCustomRolePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const toggleGroup = (group: string) => {
    setExpandedGroups(gs => gs.includes(group) ? gs.filter(g => g !== group) : [...gs, group])
  }

  const toggleGroupAll = (keys: string[]) => {
    const allOn = keys.every(k => permissions[k])
    const updated = { ...permissions }
    keys.forEach(k => { if (allOn) delete updated[k]; else updated[k] = true })
    setPermissions(updated)
  }

  const togglePerm = (key: string) => {
    setPermissions(p => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = true; return n })
  }

  const activeCount = Object.values(permissions).filter(Boolean).length

  const save = async () => {
    if (!name.trim()) return
    setSaving(true); setError("")
    const r = await fetch("/api/settings/roles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null, permissions }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to create role"); return }
    router.push("/admin/settings/roles-permissions")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Back + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={() => router.push("/admin/settings/roles-permissions")} style={{ background: "var(--muted)", border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "var(--foreground)", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Create Custom Role</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "2px 0 0" }}>Define a new role with specific permissions</p>
        </div>
      </div>

      {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        {/* Left */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={lbl}>Role name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Payslip Officer" style={inp} /></div>
          <div><label style={lbl}>Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe what this role can do" style={{ ...inp, resize: "vertical" }} /></div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", paddingTop: 4 }}>{activeCount} permission{activeCount !== 1 ? "s" : ""} selected</div>
        </div>

        {/* Right: Permission Accordion */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Permissions</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{activeCount} selected</span>
          </div>

          <div>
            {PERMISSION_GROUPS.map(grp => {
              const keys = grp.items.map(i => i.key)
              const enabledCount = keys.filter(k => permissions[k]).length
              const allOn = keys.every(k => permissions[k])
              const expanded = expandedGroups.includes(grp.group)

              return (
                <div key={grp.group} style={{ borderBottom: "1px solid var(--border)" }}>
                  <div onClick={() => toggleGroup(grp.group)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", cursor: "pointer", userSelect: "none" }}>
                    <input
                      type="checkbox"
                      checked={allOn}
                      onClick={e => e.stopPropagation()}
                      onChange={() => toggleGroupAll(keys)}
                      style={{ width: 14, height: 14, flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{grp.group}</span>
                    {enabledCount > 0 && <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>{enabledCount}/{grp.items.length}</span>}
                    {expanded ? <ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} /> : <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />}
                  </div>
                  {expanded && (
                    <div style={{ padding: "4px 20px 14px", background: "var(--background)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,220px),1fr))", gap: 4 }}>
                        {grp.items.map(item => {
                          const on = !!permissions[item.key]
                          return (
                            <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`, background: on ? "var(--muted)" : "transparent", cursor: "pointer" }}>
                              <input type="checkbox" checked={on} onChange={() => togglePerm(item.key)} style={{ width: 13, height: 13, flexShrink: 0 }} />
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

          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="secondary" onClick={() => router.push("/admin/settings/roles-permissions")}>Cancel</Button>
            <Button disabled={saving || !name.trim()} loading={saving} onClick={save}>Create Role</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
