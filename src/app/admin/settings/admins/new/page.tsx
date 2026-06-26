"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Button from "@/components/ui/Button"
import { ChevronLeft, ChevronDown, ChevronRight, Check, Loader2 } from "lucide-react"
import { PERMISSION_GROUPS } from "@/lib/admin-permissions"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

interface StaffUser {
  id: string; name: string | null; email: string | null
  employee: { id: string; firstName: string; lastName: string; employeeId: string; jobTitle: string | null; department: { name: string } | null } | null
}

interface RoleRecord {
  id: string; name: string; slug: string; description: string | null; isSystem: boolean; permissions: Record<string, boolean>
}

type WhoType = "employee" | "external"

export default function NewAdminPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Data
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [systemRoles, setSystemRoles] = useState<RoleRecord[]>([])
  const [customRoles, setCustomRoles] = useState<RoleRecord[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Section 1
  const [whoType, setWhoType] = useState<WhoType>("employee")
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<StaffUser | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [extFirst, setExtFirst] = useState("")
  const [extLast, setExtLast] = useState("")
  const [extEmail, setExtEmail] = useState("")
  const [extNote, setExtNote] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Section 2
  const [accessType, setAccessType] = useState<"full" | "limited">("limited")
  const [selectedSystemRoleIds, setSelectedSystemRoleIds] = useState<string[]>([])
  const [expandedSystemRoles, setExpandedSystemRoles] = useState<string[]>([])

  // Section 3
  const [selectedCustomRoleIds, setSelectedCustomRoleIds] = useState<string[]>([])
  const [expandedCustomRoles, setExpandedCustomRoles] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadAll = async () => {
      const [ur, rr] = await Promise.all([
        fetch("/api/settings/users").then(r => r.json()),
        fetch("/api/settings/roles").then(r => r.json()),
      ])
      const users = (ur.users ?? []).filter((u: any) => u.employee)
      setStaffUsers(users)
      const roles = rr.roles ?? []
      setSystemRoles(roles.filter((r: RoleRecord) => r.isSystem))
      setCustomRoles(roles.filter((r: RoleRecord) => !r.isSystem))
      setLoadingData(false)
    }
    loadAll()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filteredStaff = staffUsers.filter(u => {
    if (!employeeSearch) return true
    const q = employeeSearch.toLowerCase()
    return (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.employee?.employeeId ?? "").toLowerCase().includes(q)
  }).slice(0, 8)

  const section1Valid = whoType === "employee" ? !!selectedEmployee : !!(extFirst && extLast && extEmail)
  const section2Valid = accessType === "full" || selectedSystemRoleIds.length > 0
  const secondaryAdminRole = systemRoles.find(r => r.slug === "secondary-admin")
  const limitedSystemRoles = systemRoles.filter(r => r.slug !== "secondary-admin")

  const handleSubmit = async () => {
    setError("")
    const systemRoleIds = accessType === "full" && secondaryAdminRole
      ? [secondaryAdminRole.id]
      : selectedSystemRoleIds

    const payload = whoType === "employee"
      ? { type: "employee", employeeId: selectedEmployee!.employee!.id, systemRoleIds, customRoleIds: selectedCustomRoleIds }
      : { type: "external", firstName: extFirst, lastName: extLast, email: extEmail, personalNote: extNote, systemRoleIds, customRoleIds: selectedCustomRoleIds }

    setSaving(true)
    const r = await fetch("/api/settings/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to add admin"); return }
    router.push("/admin/settings/admins")
  }

  if (loadingData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
        <Loader2 size={20} style={{ animation: "spin .8s linear infinite" }} />
        <span style={{ fontSize: 14 }}>Loading…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={() => router.push("/admin/settings/admins")} style={{ background: "var(--muted)", border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "var(--foreground)", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Add New Admin</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "2px 0 0" }}>Elevate a staff member or create an external admin account</p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
        {[
          { n: 1, label: "Who are they?" },
          { n: 2, label: "System Roles" },
          { n: 3, label: "Custom Roles" },
        ].map((s, i) => {
          const done = step > s.n
          const active = step === s.n
          return (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: done ? "var(--primary)" : active ? "var(--primary)" : "var(--muted)", color: done || active ? "white" : "var(--muted-foreground)" }}>
                  {done ? <Check size={13} /> : s.n}
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--foreground)" : "var(--muted-foreground)" }}>{s.label}</span>
              </div>
              {i < 2 && <div style={{ width: 32, height: 1, background: "var(--border)", margin: "0 8px" }} />}
            </div>
          )
        })}
      </div>

      {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Step 1 */}
      {step === 1 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", padding: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 20px" }}>Who are they?</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {([["employee", "Employee of your company", "Elevate an existing staff member"], ["external", "Not an employee", "Create an admin account for someone without an employee record"]] as const).map(([val, title, desc]) => (
              <label key={val} onClick={() => setWhoType(val)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 10, border: `2px solid ${whoType === val ? "var(--primary)" : "var(--border)"}`, cursor: "pointer", background: whoType === val ? "var(--muted)" : "transparent" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${whoType === val ? "var(--primary)" : "var(--border)"}`, marginTop: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {whoType === val && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)" }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>

          {whoType === "employee" && (
            <div>
              <label style={lbl}>Select employee *</label>
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <div
                  onClick={() => setShowDropdown(d => !d)}
                  style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                >
                  {selectedEmployee ? (
                    <span style={{ fontWeight: 600 }}>
                      {selectedEmployee.name} - {selectedEmployee.employee?.employeeId}
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted-foreground)" }}>Search by name, email or ID…</span>
                  )}
                  <ChevronDown size={14} />
                </div>
                {showDropdown && (
                  <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, overflow: "hidden" }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
                      <input autoFocus placeholder="Search…" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} style={{ ...inp, width: "100%", padding: "7px 10px" }} />
                    </div>
                    <div style={{ maxHeight: 240, overflowY: "auto" }}>
                      {filteredStaff.length === 0 ? (
                        <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted-foreground)" }}>No employees found</div>
                      ) : filteredStaff.map(u => (
                        <div key={u.id} onClick={() => { setSelectedEmployee(u); setShowDropdown(false); setEmployeeSearch("") }} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: selectedEmployee?.id === u.id ? "var(--muted)" : "transparent" }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{u.employee?.employeeId} · {u.employee?.department?.name ?? "No department"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {whoType === "external" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>First name *</label><input value={extFirst} onChange={e => setExtFirst(e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Last name *</label><input value={extLast} onChange={e => setExtLast(e.target.value)} style={inp} /></div>
              </div>
              <div><label style={lbl}>Work email *</label><input type="email" value={extEmail} onChange={e => setExtEmail(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Personal note</label><textarea value={extNote} onChange={e => setExtNote(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} placeholder="Optional note about this admin account" /></div>
            </div>
          )}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Button disabled={!section1Valid} onClick={() => setStep(2)}>
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", padding: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>System Roles</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 20px" }}>Choose the level of access for this admin.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {([["full", "Full access (Secondary Admin)", "Full admin panel access - same as the Primary Admin except admin management"] as const,
               ["limited", "Limited access", "Choose specific system roles with targeted permissions"] as const
            ]).map(([val, title, desc]) => (
              <label key={val} onClick={() => setAccessType(val)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 10, border: `2px solid ${accessType === val ? "var(--primary)" : "var(--border)"}`, cursor: "pointer", background: accessType === val ? "var(--muted)" : "transparent" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${accessType === val ? "var(--primary)" : "var(--border)"}`, marginTop: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {accessType === val && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)" }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>

          {accessType === "limited" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4 }}>Select one or more roles</div>
              {limitedSystemRoles.map(role => {
                const checked = selectedSystemRoleIds.includes(role.id)
                const expanded = expandedSystemRoles.includes(role.id)
                const perms = Object.keys(role.permissions ?? {}).filter(k => (role.permissions as any)[k])
                return (
                  <div key={role.id} style={{ border: `1px solid ${checked ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: checked ? "var(--muted)" : "transparent" }}>
                      <input type="checkbox" checked={checked} onChange={() => setSelectedSystemRoleIds(ids => checked ? ids.filter(id => id !== role.id) : [...ids, role.id])} style={{ width: 15, height: 15, flexShrink: 0, cursor: "pointer" }} />
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setSelectedSystemRoleIds(ids => checked ? ids.filter(id => id !== role.id) : [...ids, role.id])}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{role.name}</div>
                        {role.description && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 1 }}>{role.description}</div>}
                      </div>
                      <button onClick={() => setExpandedSystemRoles(ids => expanded ? ids.filter(id => id !== role.id) : [...ids, role.id])} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", padding: 4 }}>
                        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                    </div>
                    {expanded && (
                      <div style={{ padding: "12px 14px 14px 40px", borderTop: "1px solid var(--border)", background: "var(--background)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 8 }}>Permissions included</div>
                        <PermissionList permissionKeys={perms} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
            <Button variant="secondary" onClick={() => setStep(1)}><ChevronLeft size={14} /> Previous</Button>
            <Button disabled={!section2Valid} onClick={() => setStep(3)}>Next <ChevronRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", padding: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Custom Roles</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 20px" }}>Optionally assign any custom roles. You can skip this step.</p>

          {customRoles.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No custom roles created yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {customRoles.map(role => {
                const checked = selectedCustomRoleIds.includes(role.id)
                const expanded = expandedCustomRoles.includes(role.id)
                const perms = Object.keys(role.permissions ?? {}).filter(k => (role.permissions as any)[k])
                return (
                  <div key={role.id} style={{ border: `1px solid ${checked ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: checked ? "var(--muted)" : "transparent" }}>
                      <input type="checkbox" checked={checked} onChange={() => setSelectedCustomRoleIds(ids => checked ? ids.filter(id => id !== role.id) : [...ids, role.id])} style={{ width: 15, height: 15, flexShrink: 0, cursor: "pointer" }} />
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setSelectedCustomRoleIds(ids => checked ? ids.filter(id => id !== role.id) : [...ids, role.id])}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{role.name}</div>
                        {role.description && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 1 }}>{role.description}</div>}
                      </div>
                      <button onClick={() => setExpandedCustomRoles(ids => expanded ? ids.filter(id => id !== role.id) : [...ids, role.id])} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", padding: 4 }}>
                        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                    </div>
                    {expanded && (
                      <div style={{ padding: "12px 14px 14px 40px", borderTop: "1px solid var(--border)", background: "var(--background)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 8 }}>Permissions included</div>
                        <PermissionList permissionKeys={perms} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <Button variant="secondary" onClick={() => setStep(2)}><ChevronLeft size={14} /> Previous</Button>
            <Button loading={saving} onClick={handleSubmit}>Add Admin</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PermissionList({ permissionKeys }: { permissionKeys: string[] }) {
  if (permissionKeys.length === 0) return <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>No permissions defined.</p>
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {PERMISSION_GROUPS.flatMap(g => g.items.filter(i => permissionKeys.includes(i.key)).map(i => (
        <span key={i.key} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--success-bg)", color: "var(--success)", fontWeight: 600 }}>{i.label}</span>
      )))}
    </div>
  )
}
