"use client"
import { useState, useEffect, useRef } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import Avatar from "@/components/ui/Avatar"
import {
  Megaphone, Plus, Edit2, Trash2, Eye, Send, Archive,
  X, Loader2, AlertCircle, Check, Image, FileText,
  Video, Bell, Monitor, Mail, AlignLeft, ChevronDown,
  Globe, Users,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}

const BEHAVIOR_OPTIONS = [
  { value: "POPUP", label: "Pop-up Modal", icon: Monitor, desc: "Opens as a modal dialog for all users" },
  { value: "NOTIFICATION_BAR", label: "Notification Bar", icon: Bell, desc: "Banner at the top of the dashboard" },
  { value: "DASHBOARD_SCROLL", label: "Dashboard Scroll", icon: AlignLeft, desc: "Scrolling ticker on the dashboard" },
  { value: "EMAIL_ONLY", label: "Send as Email", icon: Mail, desc: "Delivered only by email (no in-app)" },
]

const TYPE_OPTIONS = [
  { value: "TEXT", label: "Text", icon: FileText },
  { value: "IMAGE", label: "Image", icon: Image },
  { value: "VIDEO", label: "Video (external link)", icon: Video },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "var(--muted)", color: "var(--muted-foreground)" },
  PUBLISHED: { bg: "rgba(16,185,129,0.1)", color: "#10B981" },
  RETIRED: { bg: "rgba(156,163,175,0.2)", color: "#6B7280" },
}

const ALL_ROLES = ["SUPER_ADMIN", "PROJECT_LEAD", "STAFF"]
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  PROJECT_LEAD: "Project Lead",
  STAFF: "Staff",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────
function AnnModal({ ann, onClose, onSuccess }: { ann?: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: ann?.title ?? "",
    body: ann?.body ?? "",
    type: ann?.type ?? "TEXT",
    videoUrl: ann?.videoUrl ?? "",
    imageUrl: ann?.imageUrl ?? "",
    behavior: ann?.behavior ?? "NOTIFICATION_BAR",
    targetRoles: ann?.targetRoles ?? [],
    sendEmail: ann?.sendEmail ?? false,
    status: ann?.status ?? "DRAFT",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string>(ann?.imageUrl ?? "")
  const [uploading, setUploading] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)

  const handleImgFile = (file: File) => {
    setImgFile(file)
    const reader = new FileReader()
    reader.onload = e => setImgPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imgFile) return form.imageUrl || null
    setUploading(true)
    const fd = new FormData()
    fd.append("file", imgFile)
    fd.append("folder", "announcements")
    const r = await fetch("/api/upload", { method: "POST", body: fd })
    setUploading(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Image upload failed"); return null }
    const d = await r.json()
    return d.url
  }

  const toggleRole = (r: string) => setForm(f => ({
    ...f,
    targetRoles: f.targetRoles.includes(r) ? f.targetRoles.filter((x: string) => x !== r) : [...f.targetRoles, r],
  }))

  const save = async (publishNow = false) => {
    if (!form.title.trim()) { setError("Title is required"); return }
    setLoading(true); setError("")
    let imageUrl = form.imageUrl
    if (form.type === "IMAGE" && imgFile) {
      const uploaded = await uploadImage()
      if (!uploaded) { setLoading(false); return }
      imageUrl = uploaded
    }
    const payload = { ...form, imageUrl, status: publishNow ? "PUBLISHED" : form.status }
    const url = ann ? `/api/announcements/${ann.id}` : "/api/announcements"
    const method = ann ? "PATCH" : "POST"
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    setLoading(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed"); return }
    onSuccess(); onClose()
  }

  return (
    <Modal open onClose={onClose} title={ann ? "Edit Announcement" : "New Announcement"} width={640}>
      <div style={{ padding: 24, maxHeight: "70vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Title */}
        <div>
          <label style={{ display:"block", fontSize:12, fontWeight:600, marginBottom:5 }}>Title <span style={{ color:"var(--accent)" }}>*</span></label>
          <input value={form.title} onChange={e => setForm(f=>({...f, title:e.target.value}))} placeholder="Announcement title…" style={fi} />
        </div>

        {/* Type selector */}
        <div>
          <label style={{ display:"block", fontSize:12, fontWeight:600, marginBottom:8 }}>Content Type</label>
          <div style={{ display:"flex", gap:8 }}>
            {TYPE_OPTIONS.map(t => {
              const Icon = t.icon
              const sel = form.type === t.value
              return (
                <button key={t.value} onClick={() => setForm(f=>({...f, type:t.value}))} type="button" style={{
                  flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5, padding:"10px 8px",
                  borderRadius:10, border:`2px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                  background: sel ? "var(--primary-50, rgba(11,92,46,0.08))" : "transparent", cursor:"pointer",
                }}>
                  <Icon size={18} style={{ color: sel ? "var(--primary)" : "var(--muted-foreground)" }} />
                  <span style={{ fontSize:11, fontWeight:700, color: sel ? "var(--primary)" : "var(--muted-foreground)" }}>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content by type */}
        {form.type === "TEXT" && (
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, marginBottom:5 }}>Message</label>
            <textarea value={form.body} onChange={e => setForm(f=>({...f, body:e.target.value}))} rows={4} placeholder="Write your announcement…" style={{ ...fi, resize:"vertical" }} />
          </div>
        )}
        {form.type === "IMAGE" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {/* Upload or URL */}
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, marginBottom:5 }}>Image</label>
              <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImgFile(f) }} />
              <div
                onClick={() => imgRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith("image/")) handleImgFile(f) }}
                style={{
                  border: `2px dashed ${imgPreview ? "var(--primary)" : "var(--border)"}`,
                  borderRadius:10, padding: imgPreview ? 0 : "24px 16px", cursor:"pointer",
                  background:"var(--muted)", textAlign:"center", overflow:"hidden", minHeight: 80,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}
              >
                {imgPreview ? (
                  <div style={{ position:"relative", width:"100%" }}>
                    <img src={imgPreview} alt="preview" style={{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" }} />
                    <button onClick={e => { e.stopPropagation(); setImgFile(null); setImgPreview(""); setForm(f=>({...f,imageUrl:""})) }}
                      style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.6)", border:"none", borderRadius:"50%", width:24, height:24, cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <X size={12} />
                    </button>
                    {imgFile && <div style={{ position:"absolute", bottom:6, left:6, fontSize:10, background:"rgba(0,0,0,0.55)", color:"white", padding:"2px 7px", borderRadius:4 }}>{imgFile.name}</div>}
                  </div>
                ) : (
                  <div>
                    <Image size={24} style={{ color:"var(--muted-foreground)", margin:"0 auto 6px" }} />
                    <div style={{ fontSize:12, fontWeight:600, color:"var(--foreground)" }}>Click or drag to upload image</div>
                    <div style={{ fontSize:11, color:"var(--muted-foreground)", marginTop:2 }}>PNG, JPG, GIF, WebP — or paste a URL below</div>
                  </div>
                )}
              </div>
              {!imgFile && (
                <div style={{ marginTop:8 }}>
                  <input value={form.imageUrl} onChange={e => { setForm(f=>({...f,imageUrl:e.target.value})); setImgPreview(e.target.value) }}
                    placeholder="Or paste image URL: https://..." style={fi} />
                </div>
              )}
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, marginBottom:5 }}>Caption (optional)</label>
              <textarea value={form.body} onChange={e => setForm(f=>({...f, body:e.target.value}))} rows={2} placeholder="Caption or description…" style={{ ...fi, resize:"vertical" }} />
            </div>
          </div>
        )}
        {form.type === "VIDEO" && (
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, marginBottom:5 }}>Video URL</label>
            <input value={form.videoUrl} onChange={e => setForm(f=>({...f, videoUrl:e.target.value}))} placeholder="YouTube, Vimeo, Google Drive, OneDrive link…" style={fi} />
            <div style={{ fontSize:11, color:"var(--muted-foreground)", marginTop:4 }}>Supports YouTube, Vimeo, Google Drive, OneDrive public links.</div>
            <textarea value={form.body} onChange={e => setForm(f=>({...f, body:e.target.value}))} rows={2} placeholder="Description (optional)…" style={{ ...fi, resize:"vertical", marginTop:8 }} />
          </div>
        )}

        {/* Behavior */}
        <div>
          <label style={{ display:"block", fontSize:12, fontWeight:600, marginBottom:8 }}>Display Behavior</label>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {BEHAVIOR_OPTIONS.map(b => {
              const Icon = b.icon
              const sel = form.behavior === b.value
              return (
                <button key={b.value} onClick={() => setForm(f=>({...f, behavior:b.value}))} type="button" style={{
                  display:"flex", alignItems:"center", gap:12, padding:"10px 12px",
                  borderRadius:8, border:`1.5px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                  background: sel ? "var(--primary-50, rgba(11,92,46,0.08))" : "transparent", cursor:"pointer", textAlign:"left",
                }}>
                  <div style={{ width:32, height:32, borderRadius:8, background: sel ? "var(--primary)" : "var(--muted)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Icon size={14} style={{ color: sel ? "white" : "var(--muted-foreground)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color: sel ? "var(--primary)" : "var(--foreground)" }}>{b.label}</div>
                    <div style={{ fontSize:11, color:"var(--muted-foreground)" }}>{b.desc}</div>
                  </div>
                  {sel && <div style={{ marginLeft:"auto" }}><Check size={14} style={{ color:"var(--primary)" }} /></div>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Target audience */}
        <div>
          <label style={{ display:"block", fontSize:12, fontWeight:600, marginBottom:8 }}>Target Audience</label>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <button onClick={() => setForm(f=>({...f, targetRoles:[]}))} type="button" style={{
              fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20, cursor:"pointer",
              background: form.targetRoles.length===0 ? "var(--primary)" : "var(--muted)",
              color: form.targetRoles.length===0 ? "white" : "var(--muted-foreground)",
              border: "1.5px solid " + (form.targetRoles.length===0 ? "var(--primary)" : "var(--border)"),
            }}>
              <Globe size={10} style={{ display:"inline", marginRight:4 }} />All Roles
            </button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {ALL_ROLES.map(r => {
              const sel = form.targetRoles.includes(r)
              return (
                <button key={r} onClick={() => toggleRole(r)} type="button" style={{
                  fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, cursor:"pointer",
                  background: sel ? "var(--primary)" : "transparent", color: sel ? "white" : "var(--foreground)",
                  border: `1.5px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                }}>{ROLE_LABELS[r] ?? r}</button>
              )
            })}
          </div>
        </div>

        {/* Email option */}
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
          <input type="checkbox" checked={form.sendEmail} onChange={e => setForm(f=>({...f, sendEmail:e.target.checked}))} style={{ accentColor:"var(--primary)", width:14, height:14 }} />
          <Mail size={13} style={{ color:"var(--muted-foreground)" }} />
          <span style={{ fontSize:12, fontWeight:600 }}>Also send as email to target audience</span>
        </label>

        {error && <div style={{ display:"flex", gap:8, color:"#EF4444", fontSize:13 }}><AlertCircle size={14} />{error}</div>}
      </div>
      <div style={{ padding:"14px 24px", borderTop:"1px solid var(--border)", display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="secondary" onClick={() => save(false)} disabled={loading}>
          {loading ? <Loader2 size={13} style={{ animation:"spin .8s linear infinite" }} /> : null}
          Save as Draft
        </Button>
        <Button onClick={() => save(true)} disabled={loading}>
          <Send size={13} /> Publish Now
        </Button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const { user } = useCurrentUser()
  const isAdmin = user?.isAdmin ?? false
  const canCreateAnnouncement = user?.can("canCreateAnnouncement") ?? false
  const canEditAnnouncement = user?.can("canEditAnnouncement") ?? false
  const canDeleteAnnouncement = user?.can("canDeleteAnnouncement") ?? false

  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"ALL"|"DRAFT"|"PUBLISHED"|"RETIRED">("ALL")
  const [showCreate, setShowCreate] = useState(false)
  const [editAnn, setEditAnn] = useState<any>(null)
  const [deleting, setDeleting] = useState<string|null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/announcements${isAdmin ? "?all=1" : ""}`)
    if (r.ok) { const d = await r.json(); setAnnouncements(d.announcements ?? []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [isAdmin])

  const changeStatus = async (id: string, status: string) => {
    await fetch(`/api/announcements/${id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ status }) })
    load()
  }

  const deleteAnn = async (id: string) => {
    setDeleting(id)
    await fetch(`/api/announcements/${id}`, { method:"DELETE" })
    setDeleting(null); load()
  }

  const BEHAVIOR_ICON: Record<string, any> = { POPUP:Monitor, NOTIFICATION_BAR:Bell, DASHBOARD_SCROLL:AlignLeft, EMAIL_ONLY:Mail }
  const BEHAVIOR_LABEL: Record<string, string> = { POPUP:"Pop-up", NOTIFICATION_BAR:"Notification Bar", DASHBOARD_SCROLL:"Dashboard Scroll", EMAIL_ONLY:"Email Only" }
  const TYPE_ICON: Record<string, any> = { TEXT:FileText, IMAGE:Image, VIDEO:Video }

  const filtered = filter === "ALL" ? announcements : announcements.filter(a => a.status === filter)

  return (
    <div style={{ maxWidth:1020, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, gap:16, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Announcements</h1>
          <p style={{ color:"var(--muted-foreground)", marginTop:4, fontSize:13 }}>
            {isAdmin ? "Create and manage announcements for all employees." : "Company announcements and updates."}
          </p>
        </div>
        {canCreateAnnouncement && <Button onClick={() => setShowCreate(true)}><Plus size={14} /> New Announcement</Button>}
      </div>

      {/* Status filter tabs */}
      {isAdmin && (
        <div style={{ display:"flex", gap:0, borderBottom:"2px solid var(--border)", marginBottom:20 }}>
          {(["ALL","DRAFT","PUBLISHED","RETIRED"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:"9px 18px", border:"none", background:"transparent", cursor:"pointer",
              fontSize:12, fontWeight:filter===f ? 700 : 500,
              color: filter===f ? "var(--primary)" : "var(--muted-foreground)",
              borderBottom:`2px solid ${filter===f ? "var(--primary)" : "transparent"}`,
              marginBottom:-2,
            }}>
              {f === "ALL" ? "All" : f[0]+f.slice(1).toLowerCase()}
              <span style={{ marginLeft:6, fontSize:11, fontWeight:700, borderRadius:999, padding:"1px 6px", background: filter===f ? "var(--primary-50,rgba(11,92,46,0.1))" : "var(--muted)", color: filter===f ? "var(--primary)" : "var(--muted-foreground)" }}>
                {f === "ALL" ? announcements.length : announcements.filter(a=>a.status===f).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding:60, display:"flex", justifyContent:"center" }}>
          <Loader2 size={28} style={{ animation:"spin .8s linear infinite", color:"var(--muted-foreground)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ padding:"60px 20px", textAlign:"center" }}>
            <Megaphone size={40} style={{ color:"var(--border)", margin:"0 auto 12px" }} />
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>
              {announcements.length === 0 ? "No announcements yet" : "No announcements in this category"}
            </div>
            <div style={{ fontSize:13, color:"var(--muted-foreground)" }}>
              {isAdmin ? "Create your first announcement to share updates with employees." : "Check back later for updates from HR."}
            </div>
            {canCreateAnnouncement && announcements.length === 0 && <Button onClick={() => setShowCreate(true)} style={{ marginTop:12 }}><Plus size={14} /> Create Announcement</Button>}
          </div>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtered.map((ann: any) => {
            const BIcon = BEHAVIOR_ICON[ann.behavior] ?? Bell
            const TIcon = TYPE_ICON[ann.type] ?? FileText
            const st = STATUS_STYLE[ann.status] ?? STATUS_STYLE.DRAFT
            return (
              <div key={ann.id} style={{ background:"var(--card)", borderRadius:12, border:"1px solid var(--border)", padding:"16px 20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:"var(--primary-50,rgba(11,92,46,0.08))", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <TIcon size={20} style={{ color:"var(--primary)" }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                      <span style={{ fontSize:14, fontWeight:800, color:"var(--foreground)" }}>{ann.title}</span>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:st.bg, color:st.color, textTransform:"uppercase", letterSpacing:"0.04em" }}>{ann.status.toLowerCase()}</span>
                    </div>
                    {ann.body && <div style={{ fontSize:13, color:"var(--muted-foreground)", lineHeight:1.5, marginBottom:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:500 }}>{ann.body}</div>}
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", fontSize:11, color:"var(--muted-foreground)" }}>
                      <span style={{ display:"flex", alignItems:"center", gap:4 }}><BIcon size={11} />{BEHAVIOR_LABEL[ann.behavior]}</span>
                      {ann.targetRoles?.length > 0
                        ? <span style={{ display:"flex", alignItems:"center", gap:4 }}><Users size={11} />{ann.targetRoles.map((r: string) => ROLE_LABELS[r]??r).join(", ")}</span>
                        : <span style={{ display:"flex", alignItems:"center", gap:4 }}><Globe size={11} />All employees</span>
                      }
                      {ann.sendEmail && <span style={{ display:"flex", alignItems:"center", gap:4 }}><Mail size={11} />Email</span>}
                      <span>by {ann.createdBy?.name ?? "Admin"}</span>
                      {ann.publishedAt && <span>· Published {formatDate(ann.publishedAt)}</span>}
                    </div>
                  </div>
                  {(isAdmin || canEditAnnouncement || canDeleteAnnouncement) && (
                    <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                      {isAdmin && ann.status === "DRAFT" && (
                        <button onClick={() => changeStatus(ann.id, "PUBLISHED")} title="Publish" style={{ padding:"6px 10px", borderRadius:8, border:"none", cursor:"pointer", background:"rgba(16,185,129,0.1)", color:"#10B981", display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700 }}>
                          <Send size={12} /> Publish
                        </button>
                      )}
                      {isAdmin && ann.status === "PUBLISHED" && (
                        <button onClick={() => changeStatus(ann.id, "RETIRED")} title="Retire" style={{ padding:"6px 10px", borderRadius:8, border:"none", cursor:"pointer", background:"var(--muted)", color:"var(--muted-foreground)", display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700 }}>
                          <Archive size={12} /> Retire
                        </button>
                      )}
                      {canEditAnnouncement && (
                        <button onClick={() => setEditAnn(ann)} title="Edit" style={{ padding:"6px 8px", borderRadius:8, border:"1px solid var(--border)", cursor:"pointer", background:"var(--muted)", color:"var(--foreground)", display:"flex", alignItems:"center" }}>
                          <Edit2 size={13} />
                        </button>
                      )}
                      {canDeleteAnnouncement && (
                        <button onClick={() => setDeleteConfirm(ann.id)} title="Delete" style={{ padding:"6px 8px", borderRadius:8, border:"1px solid rgba(239,68,68,0.2)", cursor:"pointer", background:"rgba(239,68,68,0.08)", color:"#EF4444", display:"flex", alignItems:"center" }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <AnnModal onClose={() => setShowCreate(false)} onSuccess={load} />}
      {editAnn && <AnnModal ann={editAnn} onClose={() => setEditAnn(null)} onSuccess={load} />}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background:"var(--card)", borderRadius:14, padding:28, maxWidth:400, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize:16, fontWeight:800, margin:"0 0 10px" }}>Delete Announcement?</h3>
            <p style={{ fontSize:13, color:"var(--muted-foreground)", margin:"0 0 24px", lineHeight:1.6 }}>
              This will permanently remove this announcement. This cannot be undone.
            </p>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding:"9px 20px", border:"1px solid var(--border)", borderRadius:8, background:"var(--background)", fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={() => { deleteAnn(deleteConfirm); setDeleteConfirm(null) }} style={{ padding:"9px 20px", background:"#ef4444", color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
