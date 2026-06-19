"use client"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, Upload, Download, X, ChevronDown, Loader2 } from "lucide-react"
import { useDropdownPosition } from "@/hooks/useDropdownPosition"

function Toast({ msg, onClose }: { msg: { text: string; ok: boolean } | null; onClose: () => void }) {
  if (!msg) return null
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500, padding: "12px 20px", borderRadius: 10, background: msg.ok ? "#DCFCE7" : "#FEE2E2", color: msg.ok ? "#15803d" : "#DC2626", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", maxWidth: 400, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ flex: 1 }}>{msg.text}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.6 }}><X size={14} /></button>
    </div>
  )
}

export default function BulkUpdateEmployeesPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [role, setRole] = useState<"STAFF" | "PROJECT_LEAD">("STAFF")
  const [employeeScope, setEmployeeScope] = useState("")
  const [scopeOpen, setScopeOpen] = useState(false)
  const [includeExited, setIncludeExited] = useState(false)
  const [specificEmployees, setSpecificEmployees] = useState<string[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [empSearch, setEmpSearch] = useState("")
  const [empDropOpen, setEmpDropOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)
  const empRef = useRef<HTMLDivElement>(null)
  const { ref: scopeTriggerRef, pos: scopePos, recompute: recomputeScope } = useDropdownPosition<HTMLButtonElement>()
  const { ref: empTriggerRef, pos: empPos, recompute: recomputeEmp } = useDropdownPosition<HTMLDivElement>()

  useEffect(() => {
    fetch("/api/employees?status=ACTIVE").then(r => r.json()).then(d => setEmployees(d.employees ?? []))
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!scopeRef.current?.contains(e.target as Node)) setScopeOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!empRef.current?.contains(e.target as Node)) setEmpDropOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 5000)
  }

  const handleFile = (f: File | null) => {
    if (!f) return
    if (!f.name.endsWith(".csv") && !f.name.endsWith(".xlsx")) {
      showToast("Only CSV files are allowed", false); return
    }
    if (f.size > 2 * 1024 * 1024) { showToast("Maximum file size is 2MB", false); return }
    setFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleDownload = async () => {
    if (!employeeScope) { showToast("Please choose an employee scope first", false); return }
    setDownloading(true)
    try {
      const params = new URLSearchParams()
      params.set("role", role)
      if (employeeScope === "Specific Employees") {
        params.set("scope", "specific")
        params.set("ids", specificEmployees.join(","))
      } else {
        params.set("scope", "all")
      }
      params.set("includeExited", String(includeExited))

      const res = await fetch(`/api/employees/bulk-update?${params}`)
      if (!res.ok) { showToast("Failed to download template", false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "employees_bulk_update.csv"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast("Failed to download template", false)
    } finally {
      setDownloading(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/employees/bulk-update", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? "Upload failed", false); return }
      showToast(`${data.updated} employee${data.updated !== 1 ? "s" : ""} updated${data.skipped > 0 ? `, ${data.skipped} skipped` : ""}`, true)
      setFile(null)
    } catch {
      showToast("Upload failed. Please try again.", false)
    } finally {
      setUploading(false)
    }
  }

  const SCOPES = ["Choose", "All Employees", "Specific Employees"]
  const filteredEmps = employees.filter(e =>
    !specificEmployees.includes(e.id) &&
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase())
  )

  const readyItems = ["Employee ID (required) — used to match the row", "Any other field you want to update (optional)"]

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <button onClick={() => router.push("/admin/people/employees")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/people/employees")}>Employees</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
        <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Bulk Update Employees</span>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Bulk update employees in 3 steps</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Need Help? <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>Get started: Bulk update employees</span>
            </p>
          </div>

          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>What you must have ready</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {readyItems.map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={12} style={{ color: "#16a34a" }} />
                  </div>
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 0: Role */}
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Which role are you updating?</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
              The download includes only employees of the chosen role with role-appropriate columns. You cannot change someone's role via bulk update.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {([
                { val: "STAFF" as const, label: "Staff", desc: "Reports to a Project Lead" },
                { val: "PROJECT_LEAD" as const, label: "Project Lead", desc: "Leads departments, reports to a Manager" },
              ]).map(opt => (
                <button key={opt.val} type="button" onClick={() => { setRole(opt.val); setFile(null); setSpecificEmployees([]) }}
                  style={{
                    flex: 1, padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                    background: role === opt.val ? "var(--muted)" : "var(--background)",
                    border: `2px solid ${role === opt.val ? "var(--primary)" : "var(--border)"}`,
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 1: Choose employees */}
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>1. Choose employees</h3>
            <div ref={scopeRef} style={{ position: "relative", maxWidth: 260, marginBottom: 16 }}>
              <button ref={scopeTriggerRef} onClick={() => { recomputeScope(); setScopeOpen(o => !o) }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--background)", cursor: "pointer", fontSize: 14, color: employeeScope ? "var(--foreground)" : "var(--muted-foreground)" }}>
                {employeeScope || "Choose"} <ChevronDown size={14} />
              </button>
              {scopeOpen && typeof document !== "undefined" && createPortal(
                <div style={{ position: "fixed", top: scopePos.top, left: scopePos.left, width: scopePos.width, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 9999, overflow: "hidden" }}>
                  {SCOPES.map(s => (
                    <button key={s} onClick={() => { setEmployeeScope(s === "Choose" ? "" : s); setScopeOpen(false) }}
                      style={{ display: "block", width: "100%", padding: "10px 16px", background: employeeScope === s ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 14, textAlign: "left", color: "var(--foreground)", fontWeight: s === "Choose" && !employeeScope ? 700 : 400 }}>
                      {s}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
            {employeeScope === "Specific Employees" && (
              <div ref={empRef} style={{ position: "relative" }}>
                <div ref={empTriggerRef} onClick={() => { recomputeEmp(); setEmpDropOpen(true) }} style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px", border: "1.5px solid var(--primary)", borderRadius: 8, background: "var(--background)", cursor: "text", minHeight: 44, alignItems: "center" }}>
                  {specificEmployees.map(id => {
                    const emp = employees.find(e => e.id === id)
                    return emp ? (
                      <span key={id} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--muted)", padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                        {emp.firstName} {emp.lastName}
                        <button onClick={e => { e.stopPropagation(); setSpecificEmployees(ids => ids.filter(i => i !== id)) }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0 }}><X size={12} /></button>
                      </span>
                    ) : null
                  })}
                  <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} onFocus={() => { recomputeEmp(); setEmpDropOpen(true) }}
                    style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, minWidth: 80, color: "var(--foreground)" }} placeholder={specificEmployees.length === 0 ? "Search employees…" : ""} />
                </div>
                {empDropOpen && typeof document !== "undefined" && createPortal(
                  <div style={{ position: "fixed", top: empPos.top, left: empPos.left, width: empPos.width, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 240, overflowY: "auto" }}>
                    {filteredEmps.length === 0 ? (
                      <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>No results</div>
                    ) : filteredEmps.map(emp => (
                      <button key={emp.id} onClick={() => { setSpecificEmployees(ids => [...ids, emp.id]); setEmpSearch("") }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 14, textAlign: "left", color: "var(--foreground)" }}>
                        {emp.firstName} {emp.lastName}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={includeExited} onChange={e => setIncludeExited(e.target.checked)} style={{ accentColor: "var(--primary)" }} />
              Include exited employees
            </label>
          </div>

          {/* Step 2 */}
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>2. Download spreadsheet</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
              We recommend that you download a new spreadsheet before each bulk employee update. This ensures that your lookup data is up-to-date.
            </p>
            <button onClick={handleDownload} disabled={!employeeScope || downloading}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: employeeScope && !downloading ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, color: "white", opacity: employeeScope && !downloading ? 1 : 0.5 }}>
              {downloading ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Download size={16} />}
              {downloading ? "Downloading…" : "Download"}
            </button>
          </div>

          {/* Step 3 */}
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>3. Upload spreadsheet</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 4 }}>We recommend that you double-check to be sure you have filled the spreadsheet correctly.</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>Note: Maximum allowed file size is 2MB. Use CSV format.</p>
            <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onClick={() => inputRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`, borderRadius: 12, padding: "48px 32px", textAlign: "center", cursor: "pointer", background: "var(--muted)", transition: "all .15s" }}>
              <Upload size={40} style={{ color: "var(--primary)", margin: "0 auto 16px" }} />
              {file ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</span>
                  <button onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={16} /></button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop your file here</p>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>CSV with max size of 2MB</p>
                  <button style={{ padding: "10px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>Choose file</button>
                </>
              )}
              <input ref={inputRef} type="file" accept=".csv,.xlsx" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div style={{ padding: "16px 32px", display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={() => router.push("/admin/people/employees")} style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
            <button onClick={handleUpload} disabled={!file || uploading}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: file && !uploading ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, color: "white", opacity: file && !uploading ? 1 : 0.5 }}>
              {uploading && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
              {uploading ? "Updating…" : "Update Employees"}
            </button>
          </div>
        </div>
      </div>

      <Toast msg={toast} onClose={() => setToast(null)} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
