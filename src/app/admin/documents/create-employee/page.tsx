"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Inbox } from "lucide-react"

export default function CreateEmployeeDocPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [name, setName] = useState("")
  const [signedOnline, setSignedOnline] = useState<boolean | null>(null)
  const [sendToCurrent, setSendToCurrent] = useState(false)
  const [includeOnboarding, setIncludeOnboarding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) { if (f.type !== "application/pdf") { setError("Only PDF files are supported"); return } setFile(f); setError("") }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { if (f.type !== "application/pdf") { setError("Only PDF files are supported"); return } setFile(f); setError("") }
  }

  const submit = async () => {
    if (!file) { setError("Please choose a PDF file"); return }
    if (!name.trim()) { setError("Document name is required"); return }
    if (signedOnline === null) { setError("Please indicate if this document will be signed online"); return }
    setSaving(true); setError("")
    const fd = new FormData()
    fd.append("file", file)
    fd.append("title", name.trim())
    fd.append("category", "OTHER")
    fd.append("requiresAck", "true")
    fd.append("requiresSignature", String(signedOnline))
    fd.append("sentToCurrentEmployees", String(sendToCurrent))
    fd.append("includeInOnboarding", String(includeOnboarding))
    fd.append("canView", "true")
    fd.append("canDownload", "true")
    const r = await fetch("/api/documents", { method: "POST", body: fd })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Upload failed"); return }
    const d = await r.json()
    router.push(`/admin/documents/${d.doc.id}`)
  }

  const fi: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
    fontSize: 14, color: "var(--foreground)", background: "var(--card)", boxSizing: "border-box",
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 0" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 24 }}>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>Employee Document Upload</div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 8, lineHeight: 1.6 }}>
            You can upload documents that employees can acknowledge or sign, like an Employee Handbook, IP agreement, or NDA. Check that your document format is supported. We don't support processing for documents with check boxes, radio buttons, or pre-filled compensation info. Note: Maximum allowed file size is 2MB
          </div>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px" }}>
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`, borderRadius: 10,
            padding: "40px 24px", textAlign: "center", marginBottom: 24,
            background: dragOver ? "var(--primary-50)" : "var(--muted)", cursor: "pointer",
            transition: "all .15s",
          }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFile} />
          <Inbox size={40} color="var(--primary)" style={{ marginBottom: 12 }} />
          {file ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{file.name}</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Drop your files here or</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Only .pdf files with a max size of 2MB</div>
              <button
                style={{ marginTop: 16, padding: "10px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
              >
                Choose file
              </button>
            </>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <span style={{ color: "var(--danger)" }}>*</span> Document name
          </label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter document name" style={fi} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 10 }}>
            <span style={{ color: "var(--danger)" }}>* </span>Will this document be signed online?
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--foreground)", cursor: "pointer", marginBottom: 8 }}>
            <input type="radio" checked={signedOnline === true} onChange={() => setSignedOnline(true)} style={{ accentColor: "var(--primary)", width: 16, height: 16 }} />
            Yes, this document will be signed by the employee.
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--foreground)", cursor: "pointer" }}>
            <input type="radio" checked={signedOnline === false} onChange={() => setSignedOnline(false)} style={{ accentColor: "var(--primary)", width: 16, height: 16 }} />
            No, just have the employee view and acknowledge it.
          </label>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 10 }}>Who needs to fill out the file?</div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={sendToCurrent} onChange={e => setSendToCurrent(e.target.checked)} style={{ accentColor: "var(--primary)", width: 15, height: 15, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Send to current employees</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>We'll send a link to this document to your current employees and ask them to fill it out. Note that if an employee is mid-onboarding they won't receive it.</div>
            </div>
          </label>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 10 }}>Is this document for future employees?</div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={includeOnboarding} onChange={e => setIncludeOnboarding(e.target.checked)} style={{ accentColor: "var(--primary)", width: 15, height: 15, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Include in onboarding for new employees</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>This document will be available to select to send to new employees when they join</div>
            </div>
          </label>
        </div>

        {error && (
          <div style={{ background: "var(--danger-bg)", border: "1px solid var(--accent-100)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--danger)", marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => router.back()} style={{ padding: "10px 24px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ padding: "10px 24px", background: saving ? "var(--primary-light)" : "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  )
}
