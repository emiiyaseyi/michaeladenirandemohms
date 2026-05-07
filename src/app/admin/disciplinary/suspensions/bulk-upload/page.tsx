"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Inbox } from "lucide-react"

export default function BulkUploadSuspensionsPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownload = () => {
    const csv = "employee_full_name,start_date,end_date,reason\n"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "suspensions_template.xlsx"; a.click()
    URL.revokeObjectURL(url)
  }

  const check: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--foreground)", marginBottom: 8 }
  const checkIcon = (
    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#dcfce7", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7L10 1" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </span>
  )

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Bulk suspensions in 2 steps</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Need Help?{" "}
            <a href="#" style={{ color: "var(--primary)", textDecoration: "none" }}>Get started: Bulk upload Suspensions</a>
          </p>
        </div>

        <div style={{ padding: "28px" }}>
          {/* What you must have ready */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>What you must have ready</h3>
            <div style={check}>{checkIcon} Employees full name</div>
            <div style={check}>{checkIcon} Start date</div>
            <div style={check}>{checkIcon} End date</div>
            <div style={check}>{checkIcon} Reason</div>
          </div>

          {/* Step 1 */}
          <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>1. Download spreadsheet</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.6 }}>
              We recommend that you download a new spreadsheet before each bulk employee upload. This ensures that your lookup data is up-to-date.
            </p>
            <button type="button" onClick={handleDownload}
              style={{ padding: "10px 28px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Download
            </button>
          </div>

          {/* Step 2 */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>2. Upload spreadsheet</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 4, lineHeight: 1.6 }}>
              We recommend that you double-check to be sure you have filled the spreadsheet correctly.
            </p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>Note: Maximum allowed file size is 2MB.</p>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
              style={{ border: `1.5px dashed ${dragging ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, padding: "40px 24px", textAlign: "center", background: dragging ? "var(--primary-50, #f0fdf4)" : "var(--background)", transition: "background .15s" }}>
              <Inbox size={36} style={{ color: "var(--primary)", margin: "0 auto 12px" }} />
              {file ? (
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 14 }}>{file.name}</p>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Drop your files here</p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>Only XLSX with max size of 2MB</p>
                </>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ padding: "10px 28px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Choose file
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: "none" }}
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button type="button" onClick={() => router.back()}
            style={{ padding: "10px 28px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Cancel
          </button>
          <button type="button" disabled={!file}
            style={{ padding: "10px 28px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: file ? "pointer" : "default", opacity: file ? 1 : 0.6 }}>
            Upload Suspensions
          </button>
        </div>
      </div>
    </div>
  )
}
