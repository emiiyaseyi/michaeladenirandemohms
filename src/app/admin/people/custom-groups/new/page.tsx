"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Loader2, X, ChevronDown } from "lucide-react"

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

export default function NewCustomGroupPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [form, setForm] = useState({ name: "", description: "", groupByCurrency: "" as "" | "yes" | "no", memberIds: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const [dropOpen, setDropOpen] = useState(false)
  const [empSearch, setEmpSearch] = useState("")
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? [])).catch(() => {})
    const h = (e: MouseEvent) => { if (!dropRef.current?.contains(e.target as Node)) setDropOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const filteredEmps = employees.filter(e => {
    const q = empSearch.toLowerCase()
    return !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)
  })

  const toggleMember = (id: string) => {
    setForm(f => ({ ...f, memberIds: f.memberIds.includes(id) ? f.memberIds.filter(x => x !== id) : [...f.memberIds, id] }))
  }

  const removeMember = (id: string) => setForm(f => ({ ...f, memberIds: f.memberIds.filter(x => x !== id) }))

  const doSave = async () => {
    if (!form.name.trim()) { setErr("Name is required."); return }
    setSaving(true); setErr("")
    const r = await fetch("/api/people/custom-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, description: form.description, groupByCurrency: form.groupByCurrency === "yes", memberIds: form.memberIds }),
    })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    router.push("/admin/people/custom-groups")
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 13 }}>
        <button onClick={() => router.push("/admin/people/custom-groups")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 600, padding: 0 }}>Custom Groups</button>
        <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
        <span style={{ color: "var(--muted-foreground)" }}>Create Custom Groups</span>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14 }}>
        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Create Custom Group</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Enter the name of the group and choose your members.</p>
        </div>

        <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fi} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Optional"
              style={{ ...fi, resize: "vertical", fontFamily: "inherit" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 10 }}><span style={{ color: "#ef4444" }}>* </span>Group by currency? <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 400 }}>(?)</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(["yes", "no"] as const).map(v => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${form.groupByCurrency === v ? "var(--primary)" : "var(--border)"}`, background: form.groupByCurrency === v ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    onClick={() => setForm(f => ({ ...f, groupByCurrency: v }))}>
                    {form.groupByCurrency === v && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
                  </div>
                  {v === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Members</label>
            <div ref={dropRef} style={{ position: "relative" }}>
              <div onClick={() => setDropOpen(o => !o)}
                style={{ ...fi, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, minHeight: 44, cursor: "pointer", userSelect: "none" }}>
                {form.memberIds.length === 0 && <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Please select</span>}
                {form.memberIds.map(mid => {
                  const emp = employees.find(e => e.id === mid)
                  return emp ? (
                    <span key={mid} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--muted)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
                      {emp.firstName} {emp.lastName}
                      <X size={10} style={{ cursor: "pointer" }} onClick={ev => { ev.stopPropagation(); removeMember(mid) }} />
                    </span>
                  ) : null
                })}
                <ChevronDown size={14} style={{ marginLeft: "auto", color: "var(--muted-foreground)", flexShrink: 0 }} />
              </div>
              {dropOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 260, overflowY: "auto" }}>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                    <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search employees…" autoFocus
                      style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none" }} />
                  </div>
                  {filteredEmps.map(e => (
                    <div key={e.id} onClick={() => toggleMember(e.id)}
                      style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8, background: form.memberIds.includes(e.id) ? "var(--muted)" : "none" }}
                      onMouseEnter={el => (el.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={el => { if (!form.memberIds.includes(e.id)) (el.currentTarget as HTMLElement).style.background = "" }}>
                      {form.memberIds.includes(e.id) && <span style={{ color: "var(--primary)", fontSize: 12 }}>✓</span>}
                      {e.firstName} {e.lastName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {err && <div style={{ padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
        </div>

        <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={doSave} disabled={saving}
            style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
