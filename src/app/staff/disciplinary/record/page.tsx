"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronDown, ChevronRight, Search, Upload, X, Loader2 } from "lucide-react"

interface Employee { id: string; firstName: string; lastName: string; employeeId: string }
interface ViolationType { id: string; name: string }

function Dropdown({ label, options, value, onSelect, placeholder }: {
  label: string; options: { id: string; name: string }[]; value: string | null
  onSelect: (id: string, name: string) => void; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
  const selected = value ? options.find(o => o.id === value) : null

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, color: selected ? "var(--foreground)" : "var(--muted-foreground)", textAlign: "left" }}>
        {selected ? selected.name : placeholder}
        <ChevronDown size={14} style={{ flexShrink: 0, color: "var(--muted-foreground)" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 260, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
            <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Please select"
              autoFocus
              style={{ border: "none", outline: "none", fontSize: 13, width: "100%", background: "transparent", color: "var(--foreground)" }}
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            {filtered.map(o => (
              <button key={o.id} type="button"
                onClick={() => { onSelect(o.id, o.name); setOpen(false); setSearch("") }}
                style={{ width: "100%", padding: "10px 14px", background: value === o.id ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>
                {o.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: "14px", fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RecordViolationPage() {
  const router = useRouter()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([])

  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [violationTypeId, setViolationTypeId] = useState<string | null>(null)
  const [details, setDetails] = useState("")
  const [incidentDate, setIncidentDate] = useState("")
  const [expectingResponse, setExpectingResponse] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/employees?status=ACTIVE")
      .then(r => r.json())
      .then(d => setEmployees(d.employees ?? []))

    fetch("/api/disciplinary/violation-types")
      .then(r => r.json())
      .then(d => setViolationTypes(d.types ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !violationTypeId || !incidentDate || !details.trim()) {
      setError("Please fill in all required fields.")
      return
    }
    setSubmitting(true)
    setError("")

    const form = new FormData()
    form.append("employeeId", employeeId)
    form.append("violationTypeId", violationTypeId)
    form.append("incidentDate", incidentDate)
    form.append("details", details)
    form.append("expectingResponse", String(expectingResponse))
    if (file) form.append("supportingDoc", file)

    const res = await fetch("/api/disciplinary/violations", { method: "POST", body: form })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Failed to submit")
      setSubmitting(false)
      return
    }
    router.push("/staff/disciplinary")
  }

  const employeeOptions = employees.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))
  const typeOptions = violationTypes.map(t => ({ id: t.id, name: t.name }))

  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 6, display: "block" }
  const requiredDot = <span style={{ color: "#DC2626" }}>*</span>

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
        <Link href="/staff/disciplinary" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>Disciplinary</Link>
        <ChevronRight size={14} />
        <span>Record Violation</span>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "22px 28px 18px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Record employee violation</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            When you record violation for an employee and it has been approved, we'll email the employee to let them know you've submitted violation for them.
          </p>
        </div>
        <div style={{ height: 1, background: "var(--border)" }} />

        <form onSubmit={handleSubmit} style={{ padding: "28px 28px 24px" }}>
          {/* Row 1: Employee + Violation type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>{requiredDot} Employee</label>
              <Dropdown
                label="Employee"
                options={employeeOptions}
                value={employeeId}
                onSelect={(id) => setEmployeeId(id)}
                placeholder="Please select"
              />
            </div>
            <div>
              <label style={labelStyle}>{requiredDot} Violation type</label>
              <Dropdown
                label="Violation type"
                options={typeOptions}
                value={violationTypeId}
                onSelect={(id) => setViolationTypeId(id)}
                placeholder="Please select"
              />
            </div>
          </div>

          {/* Details */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{requiredDot} Details</label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Optional"
              rows={4}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, resize: "vertical", outline: "none", background: "var(--card)", color: "var(--foreground)", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>

          {/* Row 2: Incident date + Expecting response */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>{requiredDot} Incident date</label>
              <input
                type="date"
                value={incidentDate}
                onChange={e => setIncidentDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, outline: "none", background: "var(--card)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={labelStyle}>{requiredDot} Are you expecting a response?</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {[true, false].map(val => (
                  <label key={String(val)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      checked={expectingResponse === val}
                      onChange={() => setExpectingResponse(val)}
                      style={{ accentColor: "var(--primary)", width: 16, height: 16, cursor: "pointer" }}
                    />
                    {val ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Supporting document */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Do you have supporting document?</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: "1.5px dashed var(--border)", borderRadius: 10, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: "var(--muted)" }}>
              <Upload size={32} style={{ color: "var(--primary)", margin: "0 auto 10px", display: "block" }} />
              {file ? (
                <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {file.name}
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Drop your files here or</p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>Only .pdf,.jpg,.jpeg,.png files with a max size of 15MB</p>
                  <button type="button"
                    style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Choose file
                  </button>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && <p style={{ fontSize: 13, color: "#DC2626", marginBottom: 16 }}>{error}</p>}

          {/* Footer */}
          <div style={{ height: 1, background: "var(--border)", marginBottom: 20 }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button type="button" onClick={() => router.push("/staff/disciplinary")}
              style={{ padding: "9px 22px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "var(--foreground)", fontWeight: 500 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              style={{ padding: "9px 22px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              {submitting && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
              Submit
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
