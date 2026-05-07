"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Inbox, Download, Check } from "lucide-react"

export default function BulkUpdateContractorsPage() {
  const router = useRouter()
  const [contractors, setContractors] = useState<any[]>([])
  const [selection, setSelection] = useState<"all" | "specific">("all")
  const [specific, setSpecific] = useState<string[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const [search, setSearch] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const selRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/contractors").then(r => r.json()).then(d => setContractors(d.contractors ?? []))
  }, [])

  useEffect(() => {
    if (!showDrop) return
    const h = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [showDrop])

  const filtered = contractors.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const toggleSpecific = (id: string) => setSpecific(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) { setError("Only XLSX files are supported"); return }
    setFile(f); setError("")
  }

  const downloadTemplate = () => {
    const csv = '"name","currency"\n'
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = "contractors-update-template.csv"
    a.click()
  }

  const submit = async () => {
    if (!file) { setError("Please upload a spreadsheet"); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    router.push("/admin/contractors")
  }

  const selLabel = selection === "all" ? "All contractors" : specific.length ? `${specific.length} contractor${specific.length !== 1 ? "s" : ""} selected` : "Specific contractors"

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>Bulk update contractors in 3 steps</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6 }}>
            Need Help? <span style={{ color: "var(--primary)", cursor: "pointer" }}>Get started: Bulk update contractors</span>
          </div>
        </div>

        <div style={{ padding: "28px" }}>
          {/* What you must have ready */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>What you must have ready</div>
            {["Contractor name", "Default payment currency"].map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={12} color="var(--success)" strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Step 1 */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>1. Choose contractors</div>
            <div ref={selRef} style={{ position: "relative", display: "inline-block", minWidth: 220 }}>
              <button onClick={() => setShowDrop(v => !v)} style={{ padding: "9px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, width: "100%", color: "var(--foreground)" }}>
                {selLabel} <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>▼</span>
              </button>
              {showDrop && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 100, minWidth: 220 }}>
                  <button onClick={() => { setSelection("all"); setShowDrop(false) }} style={{ display: "block", width: "100%", padding: "10px 16px", background: selection === "all" ? "var(--muted)" : "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--foreground)" }}>All contractors</button>
                  <button onClick={() => { setSelection("specific"); }} style={{ display: "block", width: "100%", padding: "10px 16px", background: selection === "specific" ? "var(--muted)" : "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--foreground)" }}>Specific contractors</button>
                  {selection === "specific" && (
                    <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)" }}>
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Please select" style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--primary)", borderRadius: 6, fontSize: 13, boxSizing: "border-box", color: "var(--foreground)", background: "var(--card)" }} />
                      <div style={{ maxHeight: 140, overflowY: "auto", marginTop: 4 }}>
                        {filtered.map(c => (
                          <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 4px", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                            <input type="checkbox" checked={specific.includes(c.id)} onChange={() => toggleSpecific(c.id)} style={{ accentColor: "var(--primary)" }} />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>2. Download spreadsheet</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12 }}>We recommend that you download a new spreadsheet before each bulk contractor update. This ensures that your lookup data is up-to-date.</div>
            <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Download size={14} /> Download
            </button>
          </div>

          {/* Step 3 */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>3. Upload spreadsheet</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 4 }}>We recommend that you double-check to be sure you have filled the spreadsheet correctly.</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12 }}>Note: Maximum allowed file size is 2MB.</div>
            <div
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              style={{ border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, padding: "36px 24px", textAlign: "center", background: dragOver ? "var(--primary-50)" : "var(--muted)", cursor: "pointer", transition: "all .15s" }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <Inbox size={36} color="var(--primary)" style={{ marginBottom: 10 }} />
              {file ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Drop your files here</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Only XLSX with max size of 2MB</div>
                  <button style={{ marginTop: 12, padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                    Choose file
                  </button>
                </>
              )}
            </div>
          </div>

          {error && <div style={{ background: "var(--danger-bg)", border: "1px solid var(--accent-100)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--danger)", marginBottom: 16 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <button onClick={() => router.back()} style={{ padding: "10px 24px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Cancel</button>
            <button onClick={submit} disabled={saving} style={{ padding: "10px 24px", background: saving ? "var(--primary-light)" : "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "Updating…" : "Update Contractors"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
