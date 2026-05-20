"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, Upload, Download, X, Loader2 } from "lucide-react"

function Toast({ msg, onClose }: { msg: { text: string; ok: boolean } | null; onClose: () => void }) {
  if (!msg) return null
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500, padding: "12px 20px", borderRadius: 10, background: msg.ok ? "#DCFCE7" : "#FEE2E2", color: msg.ok ? "#15803d" : "#DC2626", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", maxWidth: 460, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ flex: 1 }}>{msg.text}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.6 }}><X size={14} /></button>
    </div>
  )
}

export default function BulkUploadAdminsPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const [results, setResults] = useState<{ created: number; skipped: number; results?: any[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const showToast = (text: string, ok: boolean) => { setToast({ text, ok }); setTimeout(() => setToast(null), 6000) }

  const handleFile = (f: File | null) => {
    if (!f) return
    if (!f.name.endsWith(".csv")) { showToast("Only CSV files are allowed", false); return }
    if (f.size > 1 * 1024 * 1024) { showToast("Maximum file size is 1MB", false); return }
    setFile(f); setResults(null)
  }

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }

  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = "/api/settings/admins/bulk-upload"
    a.download = "external_admins_template.csv"
    a.click()
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setResults(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/settings/admins/bulk-upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? "Upload failed", false); return }
      setResults(data)
      showToast(`${data.created} admin${data.created !== 1 ? "s" : ""} created${data.skipped > 0 ? `, ${data.skipped} skipped` : ""}`, true)
      setFile(null)
    } catch {
      showToast("Upload failed. Please try again.", false)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <button onClick={() => router.push("/admin/settings/admins")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/settings/admins")}>Admins</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
        <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Bulk Upload</span>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Bulk upload external admins</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Create multiple admin accounts at once. Each row generates a User with the chosen admin role bundle and receives a welcome email with their temp password.
            </p>
          </div>

          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>What you must have ready</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "First name, last name, email",
                'accessLevel: "full" (Secondary Admin / full access) or comma-separated role slugs for limited access',
                "Each email must be unique — duplicates are skipped",
              ].map(item => (
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
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>1. Download template</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
              The template lists the available role slugs in the file comments so you can pick the right ones.
            </p>
            <button onClick={handleDownload} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>
              <Download size={16} /> Download Template
            </button>
          </div>

          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>2. Upload</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>Maximum file size is 1MB. CSV only.</p>
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 12, padding: "40px 24px", textAlign: "center", cursor: "pointer",
                background: dragOver ? "rgba(var(--primary-rgb),0.04)" : "var(--muted)",
                transition: "all .15s",
              }}>
              <Upload size={36} style={{ color: "var(--primary)", margin: "0 auto 14px" }} />
              {file ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</span>
                  <button onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={16} /></button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop your CSV here</p>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>or click to choose a file</p>
                </>
              )}
              <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {results && (
            <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Results — {results.created} created, {results.skipped} skipped</div>
              {results.results && results.results.filter((r: any) => r.status === "skipped").length > 0 && (
                <div style={{ background: "var(--card)", borderRadius: 8, padding: "10px 14px", maxHeight: 220, overflowY: "auto", border: "1px solid var(--border)" }}>
                  {results.results.filter((r: any) => r.status === "skipped").map((r: any, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: "#DC2626", marginBottom: 4 }}>
                      Row {r.row} ({r.email ?? "—"}) — {r.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ padding: "16px 32px", display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={() => router.push("/admin/settings/admins")} style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
            <button onClick={handleUpload} disabled={!file || uploading}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: file && !uploading ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, color: "white", opacity: file && !uploading ? 1 : 0.5 }}>
              {uploading && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
              {uploading ? "Uploading…" : "Upload Admins"}
            </button>
          </div>
        </div>
      </div>

      <Toast msg={toast} onClose={() => setToast(null)} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
