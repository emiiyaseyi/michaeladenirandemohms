"use client"
import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import Link from "next/link"
import {
  Building2, UserCheck, Users, CalendarDays, Clock,
  Briefcase, Mail, Phone, MapPin, Heart,
  Edit2, Loader2, AlertCircle, CheckCircle2, Upload, Pencil, X,
} from "lucide-react"
import { roleLabel } from "@/lib/rbac"

const DOC_STATUS_LABEL: Record<string, string> = {
  PENDING:  "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
}

const circleBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: "50%",
  border: "1.5px solid var(--border)",
  background: "var(--background)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", flexShrink: 0,
  color: "var(--primary)",
}

function TextFieldRow({
  label, value, onEdit,
}: {
  label: string
  value?: string | null
  onEdit: () => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flex: "0 0 220px", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, color: value ? "var(--foreground)" : "var(--muted-foreground)" }}>
        {value ?? "—"}
      </div>
      <button style={circleBtn} onClick={onEdit}>
        <Pencil size={14} />
      </button>
    </div>
  )
}

function EditTextModal({
  label, value, onSave, onClose, saving,
}: {
  label: string
  value: string
  onSave: (val: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [val, setVal] = useState(value)
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: "var(--card)", borderRadius: 12, padding: "28px 28px 24px", width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Edit {label}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={`Enter ${label}`}
          autoFocus
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--border)",
            fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none",
            boxSizing: "border-box",
          }}
          onKeyDown={e => { if (e.key === "Enter") onSave(val) }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--background)", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={() => onSave(val)} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "var(--primary)", color: "white", fontSize: 13, cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={12} style={{ animation: "spin .8s linear infinite" }} />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentSections({ nin, aiMembership, onTextSaved }: { nin?: string | null; aiMembership?: string | null; onTextSaved: (field: string, val: string) => void }) {
  const [docs, setDocs] = useState<Record<string, any>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<{ field: "nin" | "aiMembership"; label: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch("/api/personal-docs")
      .then(r => r.ok ? r.json() : { docs: [] })
      .then(d => {
        const map: Record<string, any> = {}
        for (const doc of d.docs ?? []) map[doc.type] = doc
        setDocs(map)
      })
      .catch(() => {})
  }, [])

  async function handleUpload(type: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(type)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", type)
    const res = await fetch("/api/personal-docs", { method: "POST", body: fd })
    if (res.ok) {
      const d = await res.json()
      setDocs(prev => ({ ...prev, [type]: d.doc }))
    }
    setUploading(null)
  }

  async function handleSaveText(val: string) {
    if (!editModal) return
    setSaving(true)
    const res = await fetch("/api/self-service/profile/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [editModal.field]: val }),
    })
    if (res.ok) {
      onTextSaved(editModal.field, val)
      setEditModal(null)
    }
    setSaving(false)
  }

  function uploadRow(key: string, label: string) {
    return (
      <div key={key} style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ flex: "0 0 220px", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{label}</div>
        <div style={{ flex: 1, fontSize: 13, color: docs[key] ? (docs[key].status === "APPROVED" ? "#1A7336" : docs[key].status === "REJECTED" ? "#DC2626" : "#B45309") : "var(--muted-foreground)" }}>
          {docs[key] ? `${DOC_STATUS_LABEL[docs[key].status] ?? docs[key].status} · ${docs[key].fileName}` : "No file has been uploaded."}
        </div>
        <input type="file" ref={el => { fileRefs.current[key] = el }} style={{ display: "none" }}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={e => handleUpload(key, e)} />
        <button style={{ ...circleBtn, opacity: uploading === key ? 0.6 : 1, cursor: uploading === key ? "not-allowed" : "pointer" }}
          onClick={() => fileRefs.current[key]?.click()} disabled={uploading === key}>
          {uploading === key ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Upload size={14} />}
        </button>
      </div>
    )
  }

  const currentNin = nin
  const currentAi = aiMembership

  return (
    <>
      {/* General Information */}
      <Card>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>General Information</div>
        </div>

        {/* AI+ Membership — pencil modal */}
        <TextFieldRow
          label="AI+ Membership"
          value={currentAi}
          onEdit={() => setEditModal({ field: "aiMembership", label: "AI+ Membership" })}
        />

        {/* NIN — pencil modal */}
        <TextFieldRow
          label="NIN"
          value={currentNin}
          onEdit={() => setEditModal({ field: "nin", label: "NIN" })}
        />

        {/* NIN Slip — upload */}
        {uploadRow("NIN_SLIP", "NIN Slip")}

        {/* Utility Bill — upload (no bottom border on last row) */}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 20px" }}>
          <div style={{ flex: "0 0 220px", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>Utility Bill</div>
          <div style={{ flex: 1, fontSize: 13, color: docs["UTILITY_BILL"] ? (docs["UTILITY_BILL"].status === "APPROVED" ? "#1A7336" : docs["UTILITY_BILL"].status === "REJECTED" ? "#DC2626" : "#B45309") : "var(--muted-foreground)" }}>
            {docs["UTILITY_BILL"] ? `${DOC_STATUS_LABEL[docs["UTILITY_BILL"].status] ?? docs["UTILITY_BILL"].status} · ${docs["UTILITY_BILL"].fileName}` : "No file has been uploaded."}
          </div>
          <input type="file" ref={el => { fileRefs.current["UTILITY_BILL"] = el }} style={{ display: "none" }}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={e => handleUpload("UTILITY_BILL", e)} />
          <button style={{ ...circleBtn, opacity: uploading === "UTILITY_BILL" ? 0.6 : 1, cursor: uploading === "UTILITY_BILL" ? "not-allowed" : "pointer" }}
            onClick={() => fileRefs.current["UTILITY_BILL"]?.click()} disabled={uploading === "UTILITY_BILL"}>
            {uploading === "UTILITY_BILL" ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Upload size={14} />}
          </button>
        </div>
      </Card>

      {/* Educational Certifications */}
      <Card>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Educational Certifications</div>
        </div>
        {uploadRow("FIRST_DEGREE", "Degree")}
        {uploadRow("NYSC", "NYSC")}
        {/* Last row — no bottom border */}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 20px" }}>
          <div style={{ flex: "0 0 220px", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>SSCE</div>
          <div style={{ flex: 1, fontSize: 13, color: docs["SSCE"] ? (docs["SSCE"].status === "APPROVED" ? "#1A7336" : docs["SSCE"].status === "REJECTED" ? "#DC2626" : "#B45309") : "var(--muted-foreground)" }}>
            {docs["SSCE"] ? `${DOC_STATUS_LABEL[docs["SSCE"].status] ?? docs["SSCE"].status} · ${docs["SSCE"].fileName}` : "No file has been uploaded."}
          </div>
          <input type="file" ref={el => { fileRefs.current["SSCE"] = el }} style={{ display: "none" }}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={e => handleUpload("SSCE", e)} />
          <button style={{ ...circleBtn, opacity: uploading === "SSCE" ? 0.6 : 1, cursor: uploading === "SSCE" ? "not-allowed" : "pointer" }}
            onClick={() => fileRefs.current["SSCE"]?.click()} disabled={uploading === "SSCE"}>
            {uploading === "SSCE" ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Upload size={14} />}
          </button>
        </div>
      </Card>

      {editModal && (
        <EditTextModal
          label={editModal.label}
          value={editModal.field === "nin" ? (currentNin ?? "") : (currentAi ?? "")}
          onSave={handleSaveText}
          onClose={() => setEditModal(null)}
          saving={saving}
        />
      )}
    </>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderTop:"1px solid var(--border)" }}>
      <div style={{ width:32, height:32, borderRadius:8, background:"var(--muted)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={14} style={{ color:"var(--primary)" }} />
      </div>
      <div>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--muted-foreground)", marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:600, color:"var(--foreground)" }}>{value}</div>
      </div>
    </div>
  )
}

export default function SSProfilePage() {
  const pathname = usePathname()
  const roleSlug = pathname.split("/")[1]
  const editHref = `/${roleSlug}/self-service/edit`
  const leaveHref = `/${roleSlug}/requests/leave`

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nin, setNin] = useState<string | null>(null)
  const [aiMembership, setAiMembership] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/self-service/profile")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else {
          setData(d)
          setNin(d.profile?.nin ?? null)
          setAiMembership(d.profile?.aiMembership ?? null)
        }
        setLoading(false)
      })
      .catch(() => { setError("Failed to load profile"); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, gap:12, color:"var(--muted-foreground)" }}>
      <Loader2 size={20} style={{ animation:"spin .8s linear infinite" }} />
      <span style={{ fontSize:14 }}>Loading profile…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !data?.profile) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:60, textAlign:"center" }}>
      <AlertCircle size={32} style={{ color:"var(--muted-foreground)", opacity:.5 }} />
      <div style={{ fontSize:15, fontWeight:700 }}>Profile Not Found</div>
      <div style={{ fontSize:13, color:"var(--muted-foreground)" }}>{error ?? "Your account is not linked to an employee record."}</div>
    </div>
  )

  const { profile, leaveBalances } = data
  const completeness = profile.completeness ?? 0

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Page header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800 }}>My Profile</h1>
          <p style={{ fontSize:13, color:"var(--muted-foreground)", marginTop:2 }}>Your personal information and employment details</p>
        </div>
        <Link href={editHref} style={{
          display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px",
          background:"var(--primary)", color:"white", borderRadius:8,
          fontWeight:700, fontSize:13, textDecoration:"none",
        }}>
          <Edit2 size={14} /> Edit Profile
        </Link>
      </div>

      {/* Identity card */}
      <Card>
        <div style={{ padding:"24px 28px", display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
          {/* Avatar + gradient ring */}
          <div style={{ position:"relative", flexShrink:0 }}>
            <div style={{ width:96, height:96, borderRadius:"50%", padding:3, background:"linear-gradient(135deg,#6366F1,#EC4899,#F59E0B)" }}>
              <div style={{ width:"100%", height:"100%", borderRadius:"50%", overflow:"hidden", background:"var(--card)" }}>
                <Avatar name={profile.fullName} photo={profile.profilePhoto} size={90} />
              </div>
            </div>
          </div>
          {/* Name + meta */}
          <div style={{ flex:1, minWidth:200 }}>
            <h2 style={{ fontSize:22, fontWeight:800, margin:0, color:"var(--foreground)" }}>{profile.fullName}</h2>
            <div style={{ fontSize:13, color:"var(--muted-foreground)", marginTop:4 }}>
              {profile.jobTitle ?? roleLabel(profile.role)}
              {profile.department && ` · ${profile.department}`}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, fontWeight:700, color:"var(--primary)", background:"var(--primary-50)", borderRadius:6, padding:"3px 10px" }}>
                {profile.employeeId}
              </span>
              <Badge status={profile.employeeStatus ?? "ACTIVE"} />
              {profile.timeInCompany && (
                <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"var(--muted-foreground)" }}>
                  <Clock size={11} /> {profile.timeInCompany}
                </span>
              )}
            </div>
          </div>
          {/* Profile completeness */}
          <div style={{ textAlign:"center", flexShrink:0 }}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:"var(--muted)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 6px", border:`4px solid ${completeness >= 80 ? "var(--success)" : completeness >= 50 ? "#F59E0B" : "#EC4899"}` }}>
              <span style={{ fontSize:18, fontWeight:900, color: completeness >= 80 ? "var(--success)" : completeness >= 50 ? "#F59E0B" : "#EC4899" }}>
                {completeness}%
              </span>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--muted-foreground)" }}>Complete</div>
            {completeness < 100 && (
              <Link href={editHref} style={{ fontSize:10, color:"var(--primary)", textDecoration:"none", fontWeight:600 }}>
                Fill missing info →
              </Link>
            )}
            {completeness === 100 && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3, fontSize:10, color:"var(--success)", fontWeight:700 }}>
                <CheckCircle2 size={11} /> All done!
              </div>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20 }}>
        {/* Employment details */}
        <Card>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Employment</div>
          </div>
          <div style={{ padding:"4px 18px 16px" }}>
            <InfoRow icon={Briefcase}    label="Job Title"       value={profile.jobTitle} />
            <InfoRow icon={Building2}    label="Department"      value={profile.department} />
            <InfoRow icon={UserCheck}    label="Manager"         value={profile.supervisor?.name} />
            <InfoRow icon={Users}        label="Dept. Lead"      value={profile.projectLead?.name} />
            <InfoRow icon={CalendarDays} label="Work Anniversary" value={profile.workAnniversary} />
          </div>
        </Card>

        {/* Leave balances */}
        <Card>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Leave Balances</div>
            <Link href={leaveHref} style={{ fontSize:12, color:"var(--primary)", fontWeight:600, textDecoration:"none" }}>
              Apply →
            </Link>
          </div>
          <div style={{ padding:"12px 18px", display:"flex", flexDirection:"column", gap:8 }}>
            {(leaveBalances ?? []).length === 0 ? (
              <div style={{ fontSize:13, color:"var(--muted-foreground)", padding:"8px 0" }}>No leave balances configured</div>
            ) : (leaveBalances ?? []).map((lb: any) => {
              const pct = lb.allocated > 0 ? Math.min(100, (lb.remaining / lb.allocated) * 100) : 0
              const color = pct > 50 ? "var(--success)" : pct > 20 ? "#F59E0B" : "#EC4899"
              return (
                <div key={lb.leaveTypeId}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600 }}>{lb.name}</span>
                    <span style={{ fontSize:12, fontWeight:700, color }}>{lb.remaining} / {lb.allocated} days</span>
                  </div>
                  <div style={{ height:5, borderRadius:3, background:"var(--border)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Contact & personal info preview */}
      <Card>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:13, fontWeight:700 }}>Personal & Contact</div>
          <Link href={editHref} style={{ fontSize:12, color:"var(--primary)", fontWeight:600, textDecoration:"none" }}>Edit →</Link>
        </div>
        <div style={{ padding:"4px 18px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
          <InfoRow icon={Mail}    label="Work Email"    value={profile.email} />
          <InfoRow icon={Phone}   label="Phone"         value={profile.phone} />
          <InfoRow icon={MapPin}  label="City / State"  value={profile.city ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}` : undefined} />
          <InfoRow icon={Heart}   label="Marital Status" value={profile.maritalStatus} />
        </div>
      </Card>

      {/* Documents */}
      <DocumentSections
        nin={nin}
        aiMembership={aiMembership}
        onTextSaved={(field, val) => {
          if (field === "nin") setNin(val)
          else if (field === "aiMembership") setAiMembership(val)
        }}
      />

    </div>
  )
}
