"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, X } from "lucide-react"

interface Employee { id: string; firstName: string; lastName: string; employeeId: string }

interface Props {
  initial?: { name: string; description?: string | null; memberIds: string[] }
  onSubmit: (data: { name: string; description: string; memberIds: string[] }) => Promise<boolean>
  mode: "create" | "edit"
}

export default function PerformanceGroupForm({ initial, onSubmit, mode }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.memberIds ?? [])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [memberSearch, setMemberSearch] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const dropRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/employees?limit=500")
      .then(r => r.json())
      .then(d => setEmployees((d.employees ?? []).sort((a: Employee, b: Employee) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      )))
  }, [])

  useEffect(() => {
    if (!showDrop) return
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false); setMemberSearch("")
      }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [showDrop])

  const toggle = (id: string) =>
    setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const remove = (id: string) => setSelectedIds(s => s.filter(x => x !== id))

  const filtered = employees.filter(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const selectedEmployees = employees.filter(e => selectedIds.includes(e.id))

  const submit = async () => {
    if (!name.trim()) { setError("Name is required"); return }
    if (selectedIds.length === 0) { setError("At least one group member is required"); return }
    setSaving(true); setError("")
    const ok = await onSubmit({ name: name.trim(), description: description.trim(), memberIds: selectedIds })
    setSaving(false)
    if (!ok) setError("Failed to save group")
  }

  const fi: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 14, color: "var(--foreground)", background: "var(--background)",
    boxSizing: "border-box", outline: "none",
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
      {/* Header */}
      <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          {mode === "edit" ? "Edit Group" : "Create Group"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Enter the name of the group and choose your members.
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: "28px" }}>
        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            <span style={{ color: "var(--danger)" }}>* </span>Name
          </label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError("") }}
            placeholder="Enter group name"
            style={fi}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional"
            rows={3}
            style={{ ...fi, resize: "vertical" }}
          />
        </div>

        {/* Group Members */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            <span style={{ color: "var(--danger)" }}>* </span>Group Members
          </label>
          <div ref={dropRef} style={{ position: "relative" }}>
            {/* Dropdown — appears above */}
            {showDrop && (
              <div style={{
                position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 4,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 8, boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
                zIndex: 100, maxHeight: 220, overflowY: "auto",
              }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>No employees found</div>
                ) : filtered.map(e => {
                  const sel = selectedIds.includes(e.id)
                  return (
                    <button key={e.id} onClick={() => toggle(e.id)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "10px 16px",
                      background: sel ? "var(--primary-50)" : "none",
                      border: "none", cursor: "pointer", textAlign: "left", fontSize: 14,
                      color: sel ? "var(--primary)" : "var(--foreground)",
                    }}
                      onMouseEnter={ev => { if (!sel) (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                      onMouseLeave={ev => { if (!sel) (ev.currentTarget as HTMLElement).style.background = "none" }}>
                      {e.firstName} {e.lastName}
                      {sel && <X size={12} />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Pills input */}
            <div
              onClick={() => { setShowDrop(true); inputRef.current?.focus() }}
              style={{
                minHeight: 44, padding: "6px 10px", cursor: "text",
                border: `1px solid ${showDrop ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
                background: "var(--background)",
              }}
            >
              {selectedEmployees.map(e => (
                <span key={e.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "var(--muted)", borderRadius: 6, padding: "3px 8px",
                  fontSize: 13, color: "var(--foreground)", border: "1px solid var(--border)",
                }}>
                  {e.firstName} {e.lastName}
                  <button onClick={ev => { ev.stopPropagation(); remove(e.id) }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "var(--muted-foreground)", display: "flex" }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                value={memberSearch}
                onChange={ev => { setMemberSearch(ev.target.value); setShowDrop(true) }}
                onFocus={() => setShowDrop(true)}
                placeholder={selectedIds.length === 0 ? "Search employees…" : ""}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--foreground)", minWidth: 120, flex: 1 }}
              />
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                {selectedIds.length > 0 && (
                  <button onClick={ev => { ev.stopPropagation(); setSelectedIds([]) }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--muted-foreground)", display: "flex" }}>
                    <X size={14} />
                  </button>
                )}
                <ChevronDown size={14} style={{ color: "var(--muted-foreground)", transform: showDrop ? "rotate(180deg)" : "rotate(0)", transition: "transform .15s" }} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 16, background: "var(--danger-bg)", border: "1px solid var(--accent-100)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--danger)" }}>{error}</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button onClick={() => router.back()} style={{ padding: "9px 24px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
          Cancel
        </button>
        <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}
