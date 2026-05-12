"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Inbox, Download, Check } from "lucide-react"

export default function BulkUploadContractorsPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) { setError("Only XLSX files are supported"); return }
    setFile(f); setError("")
  }

  const downloadTemplate = () => {
    const csv = '"name","email","phone","country","businessType","state","address","companyRegNumber","industry","currency","paymentRoute","bankName","accountNumber"\n'
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = "contractors-upload-template.csv"
    a.click()
  }

  const submit = async () => {
    if (!file) { setError("Please upload a spreadsheet"); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    router.push("/admin/contractors")
  }

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>Download the file, fill it out and upload to enroll your contractors.</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6 }}>
            Need Help? <span style={{ color: "var(--primary)", cursor: "pointer" }}>Get Started: Bulk Upload Contractors</span>
          </div>
        </div>

        <div style={{ padding: "28px" }}>
          {/* What you must have ready */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 12 }}>What you must have ready</div>
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
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>1. Download spreadsheet</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12 }}>We recommend that you download a new spreadsheet before each bulk contractor upload. This ensures that your lookup data is up-to-date.</div>
            <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Download size={14} /> Download
            </button>
          </div>

          {/* Step 2 */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>2. Upload spreadsheet</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 4 }}>We recommend that you double-check to be sure you have filled the spreadsheet correctly.</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12 }}>Note: Maximum allowed file size is 2MB.</div>
            <div
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              style={{ border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, padding: "40px 24px", textAlign: "center", background: dragOver ? "var(--primary-50)" : "var(--muted)", cursor: "pointer", transition: "all .15s" }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <Inbox size={40} color="var(--primary)" style={{ marginBottom: 10 }} />
              {file ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Drop your files here</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Only XLSX with max size of 2MB</div>
                  <button style={{ marginTop: 14, padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
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
              {saving ? "Creating…" : "Create Contractors"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
