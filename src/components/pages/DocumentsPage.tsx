"use client"
import { useState, useEffect, useRef } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import {
  FolderOpen, Upload, FileText, Search, Trash2, Edit2, Download,
  CheckCircle, Clock, Eye, EyeOff, Shield, ChevronDown, X, Loader2,
  AlertCircle, FileBadge, FileCheck, FileX, Lock
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const CATEGORIES: [string, string][] = [
  ["ALL", "All"],
  ["ONBOARDING", "Onboarding"],
  ["POLICY", "Policy"],
  ["SOP", "Standard Operating Procedures"],
  ["TEMPLATE", "Templates"],
  ["OTHER", "Other"],
]

const CATEGORY_COLORS: Record<string, string> = {
  ONBOARDING: "#6366F1",
  POLICY: "#0EA5E9",
  SOP: "#10B981",
  TEMPLATE: "#F59E0B",
  OTHER: "#8B5CF6",
}

function formatBytes(bytes: number) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(s: string) {
  if (!s) return ""
  return new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

function CategoryBadge({ cat }: { cat: string }) {
  const label = CATEGORIES.find(([v]) => v === cat)?.[1] ?? cat
  const color = CATEGORY_COLORS[cat] ?? "#8B5CF6"
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: color + "18", color, border: `1px solid ${color}40`,
      textTransform: "uppercase", letterSpacing: "0.04em",
    }}>{label}</span>
  )
}

// ── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", category: "OTHER", description: "", canView: true, canDownload: false, canCopy: true, requiresAck: false })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (!form.title.trim()) { setError("Title is required"); return }
    if (!file) { setError("Please select a file"); return }
    setLoading(true); setError("")
    const fd = new FormData()
    fd.append("file", file)
    fd.append("title", form.title)
    fd.append("category", form.category)
    fd.append("description", form.description)
    fd.append("canView", String(form.canView))
    fd.append("canDownload", String(form.canDownload))
    fd.append("canCopy", String(form.canCopy))
    fd.append("requiresAck", String(form.requiresAck))
    const r = await fetch("/api/documents", { method: "POST", body: fd })
    setLoading(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Upload failed"); return }
    onSuccess()
    onClose()
  }

  const fi = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" as const }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--foreground)" }}>Upload Document</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 5 }}>Document Title <span style={{ color: "var(--accent)" }}>*</span></label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Employee Handbook 2025" style={fi} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 5 }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={fi}>
                {CATEGORIES.filter(([v]) => v !== "ALL").map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 5 }}>File</label>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => fileRef.current?.click()} style={{ ...fi, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: file ? "var(--foreground)" : "var(--muted-foreground)" }}>
                <Upload size={13} />
                <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file ? file.name : "Choose file…"}</span>
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 5 }}>Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this document" rows={2} style={{ ...fi, resize: "vertical" }} />
          </div>
          <div style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 10 }}>Access Controls</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { key: "canView", icon: Eye, label: "Employees can view", desc: "Document visible to all employees" },
                { key: "canDownload", icon: Download, label: "Allow downloads", desc: "Employees can download a copy" },
                { key: "canCopy", icon: Shield, label: "Allow text selection & copy", desc: "Disable to prevent text copying in viewer" },
                { key: "requiresAck", icon: FileCheck, label: "Requires acknowledgement", desc: "Employees must confirm they've read it" },
              ].map(({ key, icon: Icon, label, desc }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} style={{ width: 14, height: 14, accentColor: "var(--primary)" }} />
                  <Icon size={13} style={{ color: "var(--muted-foreground)" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
              <AlertCircle size={14} />{error}
            </div>
          )}
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Uploading…</> : <><Upload size={13} /> Upload</>}
          </Button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Edit Modal (admin) ───────────────────────────────────────────────────────
function EditModal({ doc, onClose, onSuccess }: { doc: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: doc.title, category: doc.category, description: doc.description ?? "", canView: doc.canView, canDownload: doc.canDownload, canCopy: doc.canCopy ?? true, requiresAck: doc.requiresAck })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fi = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" as const }

  const save = async () => {
    setLoading(true); setError("")
    const r = await fetch(`/api/documents/${doc.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setLoading(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed"); return }
    onSuccess(); onClose()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Edit Document</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={fi} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={fi}>
              {CATEGORIES.filter(([v]) => v !== "ALL").map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...fi, resize: "vertical" }} />
          </div>
          <div style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 10 }}>Access Controls</div>
            {[
              { key: "canView", label: "Employees can view" },
              { key: "canDownload", label: "Allow downloads" },
              { key: "canCopy", label: "Allow text selection & copy" },
              { key: "requiresAck", label: "Requires acknowledgement" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} style={{ accentColor: "var(--primary)" }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
              </label>
            ))}
          </div>
          {error && <div style={{ color: "#EF4444", fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>
    </div>
  )
}

// ── Ack Modal (employee) ─────────────────────────────────────────────────────
function AckModal({ doc, onClose, onSuccess, userName }: { doc: any; onClose: () => void; onSuccess: () => void; userName: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [nameInput, setNameInput] = useState("")
  const [viewed, setViewed] = useState(false)

  // Name must match profile name (case-insensitive, trimmed)
  const nameMatches = nameInput.trim().toLowerCase() === userName.trim().toLowerCase()

  const confirm = async () => {
    if (!nameMatches) { setError(`Name must match your profile name: "${userName}"`); return }
    setLoading(true); setError("")
    const r = await fetch(`/api/documents/${doc.id}/ack`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nameInput }) })
    setLoading(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed"); return }
    onSuccess(); onClose()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        {/* Document preview panel */}
        {!viewed ? (
          <>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Read Before Acknowledging</div>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>
            <div style={{ height: 420, overflow: "hidden", background: "#111" }}>
              {doc.mimeType === "application/pdf" ? (
                // Use object tag with no toolbar — prevents browser download UI
                <object data={`${doc.fileUrl}#toolbar=0&navpanes=0&scrollbar=1`} type="application/pdf"
                  style={{ width: "100%", height: "100%", border: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "white", fontSize: 13 }}>
                    Preview not available. Please download to read, then return to acknowledge.
                  </div>
                </object>
              ) : doc.mimeType?.startsWith("image/") ? (
                <img src={doc.fileUrl} alt={doc.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 10, color: "white" }}>
                  <FileText size={36} />
                  <div style={{ fontSize: 13 }}>{doc.title}</div>
                </div>
              )}
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={() => setViewed(true)}>I have read this document →</Button>
            </div>
          </>
        ) : (
          <div style={{ padding: "28px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <FileCheck size={24} style={{ color: "#10B981" }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--foreground)", marginBottom: 6 }}>Acknowledge Document</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                I confirm I have read and understood <strong>{doc.title}</strong>.
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                Type your full name exactly as it appears on your profile
              </label>
              <input
                value={nameInput}
                onChange={e => { setNameInput(e.target.value); setError("") }}
                placeholder={userName}
                autoFocus
                style={{
                  width: "100%", padding: "10px 12px", boxSizing: "border-box",
                  border: `1.5px solid ${nameInput && !nameMatches ? "#EF4444" : nameMatches ? "#10B981" : "var(--border)"}`,
                  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
                }}
              />
              {nameInput && !nameMatches && (
                <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>
                  Name does not match. Expected: <strong>{userName}</strong>
                </div>
              )}
              {nameMatches && (
                <div style={{ fontSize: 11, color: "#10B981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle size={11} /> Name confirmed
                </div>
              )}
            </div>
            {error && <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 10, padding: "8px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 6 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button variant="secondary" onClick={() => setViewed(false)} style={{ flex: 1 }}>← Back</Button>
              <Button onClick={confirm} disabled={loading || !nameMatches} style={{ flex: 1 }}>
                {loading ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Confirming…</> : "Confirm & Acknowledge"}
              </Button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Doc Card ─────────────────────────────────────────────────────────────────
function DocCard({ doc, isAdmin, totalEmployees, onEdit, onDelete, onAck, onView }: {
  doc: any; isAdmin: boolean; totalEmployees?: number; onEdit: () => void; onDelete: () => void; onAck: () => void; onView: () => void
}) {
  const ackCount = doc._count?.acknowledgments ?? 0
  const myAck = doc.myAck
  const isPdf = doc.mimeType === "application/pdf"

  return (
    <div style={{
      background: "var(--card)", borderRadius: 12, padding: "16px 18px",
      border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10,
      transition: "box-shadow 0.15s",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: (CATEGORY_COLORS[doc.category] ?? "#8B5CF6") + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FileText size={18} style={{ color: CATEGORY_COLORS[doc.category] ?? "#8B5CF6" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{doc.title}</span>
            <CategoryBadge cat={doc.category} />
          </div>
          {doc.description && <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{doc.description}</div>}
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
          Uploaded by {doc.uploadedBy?.name ?? "Admin"} · {formatDate(doc.createdAt)}
          {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ""}
        </span>
        {/* Access flags */}
        <div style={{ display: "flex", gap: 4 }}>
          {doc.canView && <span title="Visible to employees" style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "rgba(14,165,233,0.1)", color: "#0EA5E9" }}><Eye size={9} style={{ display: "inline", marginRight: 3 }} />View</span>}
          {doc.canDownload && <span title="Downloadable" style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "rgba(16,185,129,0.1)", color: "#10B981" }}><Download size={9} style={{ display: "inline", marginRight: 3 }} />Download</span>}
          {doc.requiresAck && <span title="Requires acknowledgement" style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}><FileCheck size={9} style={{ display: "inline", marginRight: 3 }} />Ack</span>}
          {!doc.canView && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "rgba(239,68,68,0.08)", color: "#EF4444" }}><Lock size={9} style={{ display: "inline", marginRight: 3 }} />Restricted</span>}
        </div>
      </div>

      {/* Admin: ack progress */}
      {isAdmin && doc.requiresAck && totalEmployees && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600 }}>Acknowledgements</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)" }}>{ackCount}/{totalEmployees}</span>
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (ackCount / totalEmployees) * 100)}%`, background: "#10B981", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Employee: ack status */}
      {!isAdmin && doc.requiresAck && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: myAck?.acknowledged ? "#10B981" : "#F59E0B" }}>
          {myAck?.acknowledged ? <><CheckCircle size={13} /> Acknowledged {formatDate(myAck.acknowledgedAt)}</> : <><Clock size={13} /> Acknowledgement required</>}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(isAdmin || doc.canView) && (
          <button onClick={onView} style={{
            fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8, cursor: "pointer",
            background: "var(--primary)", color: "white", border: "none", display: "flex", alignItems: "center", gap: 5,
          }}><Eye size={11} /> View</button>
        )}
        {isAdmin && (
          <a href={doc.fileUrl} download style={{
            fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8, cursor: "pointer",
            background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5,
          }}><Download size={11} /> Download</a>
        )}
        {!isAdmin && doc.canDownload && (
          <a href={doc.fileUrl} download style={{
            fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8, cursor: "pointer",
            background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5,
          }}><Download size={11} /> Download</a>
        )}
        {!isAdmin && doc.requiresAck && !myAck?.acknowledged && (
          <button onClick={onAck} style={{
            fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8, cursor: "pointer",
            background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", gap: 5,
          }}><FileCheck size={11} /> Acknowledge</button>
        )}
        {isAdmin && (
          <>
            <button onClick={onEdit} style={{
              fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, cursor: "pointer",
              background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 5,
            }}><Edit2 size={11} /> Edit</button>
            <button onClick={onDelete} style={{
              fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, cursor: "pointer",
              background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", gap: 5,
            }}><Trash2 size={11} /> Delete</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { user } = useCurrentUser()
  const isAdmin = ["ADMIN","ADMIN","ADMIN"].includes(user?.role ?? "")

  const [docs, setDocs] = useState<any[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("ALL")
  const [showUpload, setShowUpload] = useState(false)
  const [editDoc, setEditDoc] = useState<any>(null)
  const [ackDoc, setAckDoc] = useState<any>(null)
  const [viewDoc, setViewDoc] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/documents")
    if (r.ok) {
      const d = await r.json()
      setDocs(d.docs ?? [])
      if (d.totalEmployees) setTotalEmployees(d.totalEmployees)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document? Employees will no longer be able to view it.")) return
    await fetch(`/api/documents/${id}`, { method: "DELETE" })
    setDocs(d => d.filter(x => x.id !== id))
  }

  const filtered = docs.filter(d => {
    const matchCat = catFilter === "ALL" || d.category === catFilter
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || (d.description ?? "").toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const pendingAck = docs.filter(d => d.requiresAck && !d.myAck?.acknowledged)

  return (
    <div style={{ maxWidth: 1020, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>Document Library</h1>
          <p style={{ color: "var(--muted-foreground)", marginTop: 4, fontSize: 13 }}>
            {isAdmin ? "Upload, manage, and control access to company documents." : "Company policies, templates, and important documents."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowUpload(true)}><Upload size={14} /> Upload Document</Button>
        )}
      </div>

      {/* Employee pending ack banner */}
      {!isAdmin && pendingAck.length > 0 && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <Clock size={16} style={{ color: "#F59E0B", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#92400E", fontWeight: 600 }}>
            You have {pendingAck.length} document{pendingAck.length > 1 ? "s" : ""} requiring acknowledgement.
          </span>
        </div>
      )}

      {/* Stats (admin only) */}
      {isAdmin && docs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Documents", value: docs.length, color: "#6366F1" },
            { label: "Require Ack", value: docs.filter(d => d.requiresAck).length, color: "#F59E0B" },
            { label: "Downloadable", value: docs.filter(d => d.canDownload).length, color: "#10B981" },
            { label: "Restricted", value: docs.filter(d => !d.canView).length, color: "#EF4444" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--card)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{ width: "100%", paddingLeft: 32, padding: "9px 12px 9px 32px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map(([v, l]) => (
            <button key={v} onClick={() => setCatFilter(v)} style={{
              fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 20, cursor: "pointer", border: "1.5px solid",
              background: catFilter === v ? "var(--primary)" : "transparent",
              color: catFilter === v ? "white" : "var(--foreground)",
              borderColor: catFilter === v ? "var(--primary)" : "var(--border)",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted-foreground)" }}>
          <Loader2 size={28} style={{ animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13 }}>Loading documents…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <FolderOpen size={40} style={{ color: "var(--border)", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
            {docs.length === 0 ? "No documents yet" : "No documents match your filters"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            {isAdmin && docs.length === 0 ? "Upload your first document to get started." : "Try adjusting your search or category filter."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
          {filtered.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              isAdmin={isAdmin}
              totalEmployees={totalEmployees}
              onEdit={() => setEditDoc(doc)}
              onDelete={() => deleteDoc(doc.id)}
              onAck={() => setAckDoc(doc)}
              onView={() => setViewDoc(doc)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={load} />}
      {editDoc && <EditModal doc={editDoc} onClose={() => setEditDoc(null)} onSuccess={load} />}
      {ackDoc && <AckModal doc={ackDoc} onClose={() => setAckDoc(null)} onSuccess={load} userName={user?.name ?? ""} />}

      {/* View modal — no download button for non-admins */}
      {viewDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 860, height: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>{viewDoc.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Only admins or canDownload docs get a download button */}
                {(isAdmin || viewDoc.canDownload) && (
                  <a href={viewDoc.fileUrl} download
                    style={{ fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 7, background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                    <Download size={12} /> Download
                  </a>
                )}
                <button onClick={() => setViewDoc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
              </div>
            </div>
            <div
              style={{ flex: 1, overflow: "hidden", position: "relative", userSelect: !isAdmin && !viewDoc.canCopy ? "none" : "auto" }}
              onCopy={!isAdmin && !viewDoc.canCopy ? e => e.preventDefault() : undefined}
              onContextMenu={!isAdmin && !viewDoc.canCopy ? e => e.preventDefault() : undefined}
            >
              {/* Screenshot / print overlay for copy-restricted docs */}
              {!isAdmin && !viewDoc.canCopy && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none", background: "transparent" }}
                  onCopy={e => e.preventDefault()}
                />
              )}
              {viewDoc.mimeType === "application/pdf" ? (
                // #toolbar=0 suppresses the PDF browser toolbar (and its download button)
                <object data={`${viewDoc.fileUrl}#toolbar=0&navpanes=0&scrollbar=1`} type="application/pdf"
                  style={{ width: "100%", height: "100%", border: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
                    <FileText size={40} style={{ color: "var(--muted-foreground)" }} />
                    <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Preview not available in your browser.</div>
                  </div>
                </object>
              ) : viewDoc.mimeType?.startsWith("image/") ? (
                <img src={viewDoc.fileUrl} alt={viewDoc.title}
                  style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: !isAdmin && !viewDoc.canCopy ? "none" : "auto" }}
                  draggable={isAdmin || !!viewDoc.canCopy}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
                  <FileText size={40} style={{ color: "var(--muted-foreground)" }} />
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Preview not available for this file type.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
