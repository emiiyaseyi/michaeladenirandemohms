"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

export default function BulkAbsenceUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownload = () => {
    const csv = "employee_id,date\n"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "absence_template.xlsx"; a.click()
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
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Bulk Absence Upload</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Need Help?{" "}
            <a href="#" style={{ color: "var(--primary)", textDecoration: "none" }}>Get Started: Bulk upload absent days</a>
          </p>
        </div>

        <div style={{ padding: "28px" }}>
          {/* What you must have ready */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>What you must have ready</h3>
            <div style={check}>{checkIcon} Employees ID</div>
            <div style={check}>{checkIcon} Date</div>
          </div>

          {/* Step 1 */}
          <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>1. Import your spreadsheet or download a template (Optional)</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.6 }}>
              You can import your own spreadsheet or download a template to get started.
            </p>
            <button type="button" onClick={handleDownload}
              style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
              Download Template
            </button>
          </div>

          {/* Step 2 */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>2. Upload spreadsheet</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 4, lineHeight: 1.6 }}>
              We recommend that you double-check to be sure you have filled the spreadsheet correctly.
            </p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>Note: Maximum allowed file size is 2MB.</p>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ padding: "10px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                Choose file
              </button>
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{file ? file.name : "No file selected"}</span>
              <input ref={fileInputRef} type="file" accept=".xlsx,.csv" style={{ display: "none" }}
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
            Upload
          </button>
        </div>
      </div>
    </div>
  )
}
