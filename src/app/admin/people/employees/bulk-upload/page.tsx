"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, Upload, Download, X } from "lucide-react"

export default function BulkUploadEmployeesPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File | null) => {
    if (!f) return
    if (!f.name.endsWith(".xlsx")) { alert("Only XLSX files are allowed"); return }
    if (f.size > 2 * 1024 * 1024) { alert("Maximum file size is 2MB"); return }
    setFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const readyItems = [
    "Employees full name",
    "Hire date",
    "Work location",
    "Paygrade (Optional)",
  ]

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <button onClick={() => router.push("/admin/people/employees")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/people/employees")}>Employees</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
        <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Bulk upload new members</span>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Bulk upload employees</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Need Help? <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>Get started: Bulk upload employees</span>
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

          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>1. Download spreadsheet</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
              We recommend that you download a new spreadsheet before each bulk employee upload. This ensures that your lookup data is up-to-date.
            </p>
            <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>
              <Download size={16} /> Download
            </button>
          </div>

          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>2. Upload spreadsheet</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 4 }}>
              We recommend that you double-check to be sure you have filled the spreadsheet correctly. If you choose to invite employees to enter their details online, they'll be invited to onboard after a successfull upload.
            </p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>Note: Maximum allowed file size is 2MB.</p>
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 12, padding: "48px 32px", textAlign: "center", cursor: "pointer",
                background: dragOver ? "rgba(var(--primary-rgb),0.04)" : "var(--muted)",
                transition: "all .15s",
              }}>
              <Upload size={40} style={{ color: "var(--primary)", margin: "0 auto 16px" }} />
              {file ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</span>
                  <button onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={16} /></button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop your files here or</p>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>Only XLSX with max size of 2MB</p>
                  <button style={{ padding: "10px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>
                    Choose file
                  </button>
                </>
              )}
              <input ref={inputRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div style={{ padding: "16px 32px", display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={() => router.push("/admin/people/employees")} style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
            <button disabled={!file} style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: file ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, color: "white", opacity: file ? 1 : 0.5 }}>
              Upload Employees
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
