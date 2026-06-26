"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ChevronLeft, ChevronDown, Edit2, Upload, Loader2,
  Building2, User, CreditCard, FileText, Briefcase, MapPin,
  X, Search, Check, UserCog,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const TABS = ["Job", "Personal", "Request", "Documents", "Assets", "Disciplinary", "Logs"]

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:     { bg: "#DCFCE7", color: "#16a34a", label: "Active" },
  ON_LEAVE:   { bg: "#FEF3C7", color: "#D97706", label: "On Leave" },
  TERMINATED: { bg: "#FEE2E2", color: "#DC2626", label: "Inactive" },
  RESIGNED:   { bg: "#F3F4F6", color: "#6B7280", label: "Resigned" },
  SUSPENDED:  { bg: "#FEF3C7", color: "#D97706", label: "Suspended" },
}

const EMP_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time",
  CONTRACT: "Contract", INTERN: "Intern",
}

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}
const maxDob = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 13); return d.toISOString().split("T")[0] })()

function Modal({ title, onClose, onSave, saving, err, wide, children }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; err: string; wide?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: wide ? 680 : 520, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><X size={18} /></button>
          </div>
          <div style={{ padding: "24px" }}>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
              This information is used for Benefits and HR, so please make sure it's accurate.
            </p>
            {children}
          </div>
          {err && <div style={{ margin: "0 24px 16px", padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

function MF({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function InfoCard({ icon, iconBg, title, children, onEdit }: {
  icon: React.ReactNode; iconBg: string; title: string; children: React.ReactNode; onEdit?: () => void
}) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
        </div>
        {onEdit && (
          <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
            <Edit2 size={11} /> Edit
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <span style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0, minWidth: 120 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right", color: value ? "var(--foreground)" : "var(--muted-foreground)" }}>
        {value ?? "-"}
      </span>
    </div>
  )
}

function Av({ name, photo, size = 80 }: { name: string; photo?: string | null; size?: number }) {
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.3)" }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.3, fontWeight: 800, color: "white" }}>
      {initials}
    </div>
  )
}

function PLDepartmentsCard({ emp }: { emp: any }) {
  const [allDepts, setAllDepts] = useState<any[]>([])
  const [assigned, setAssigned] = useState<string[]>(() => {
    const plDepts = (emp.user?.projectLeadDepartments ?? []).map((d: any) => d.departmentId)
    if (plDepts.length > 0) return plDepts
    // Fall back to the employee's own department so at least one is pre-selected
    return emp.departmentId ? [emp.departmentId] : []
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => setAllDepts(d.departments ?? []))
  }, [])

  const toggle = (id: string) =>
    setAssigned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const save = async () => {
    setSaving(true)
    await fetch(`/api/employees/${emp.id}/pl-departments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentIds: assigned }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ gridColumn: "1 / -1", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={16} color="#6366f1" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Project Lead - Assigned Departments</span>
        </div>
        <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: saved ? "var(--success)" : "var(--primary)", border: "none", borderRadius: 7, cursor: saving ? "wait" : "pointer", fontSize: 12, fontWeight: 700, color: "white", transition: "background .2s" }}>
          {saving ? <><Loader2 size={11} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
        Choose which departments this Project Lead is responsible for. Leave requests from staff in these departments will be routed to them for approval.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {allDepts.map((d: any) => {
          const sel = assigned.includes(d.id)
          return (
            <button key={d.id} onClick={() => toggle(d.id)}
              style={{ padding: "6px 14px", borderRadius: 20, border: `2px solid ${sel ? "#6366f1" : "var(--border)"}`, background: sel ? "rgba(99,102,241,0.12)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? "#6366f1" : "var(--foreground)", transition: "all .15s" }}>
              {sel && <Check size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />}
              {d.name}
            </button>
          )
        })}
        {allDepts.length === 0 && <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading departments…</span>}
      </div>
    </div>
  )
}

function TabJobPay({ emp, openModal }: { emp: any; openModal: (k: string, d: any) => void }) {
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"
  const isoDate = (d?: string | null) => d ? d.slice(0, 10) : ""
  const isIntern = (emp.jobTitle ?? "").toLowerCase().includes("intern") || emp.employmentType === "INTERN"

  return (
    <div className="grid-2col" style={{ gap: 20 }}>
      <InfoCard icon={<Briefcase size={16} color="#16a34a" />} iconBg="#DCFCE7" title="Employment Details"
        onEdit={() => openModal("employment", { departmentId: emp.department?.id ?? "", managerId: emp.manager?.id ?? "", hireDate: isoDate(emp.hireDate), internReportStartDate: isoDate(emp.internReportStartDate) })}>
        <InfoRow label="Department" value={emp.department?.name} />
        <InfoRow label={emp.user?.role === "PROJECT_LEAD" ? "Manager" : "Project Lead"} value={emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : null} />
        <InfoRow label="Start Date" value={fmtDate(emp.hireDate)} />
        <InfoRow label="Employee No." value={emp.employeeId} />
        {isIntern && <InfoRow label="Intern Report Start" value={emp.internReportStartDate ? fmtDate(emp.internReportStartDate) : `Account creation (${fmtDate(emp.createdAt)})`} />}
      </InfoCard>

      <InfoCard icon={<CreditCard size={16} color="#6b7280" />} iconBg="#F3F4F6" title="Employment Details"
        onEdit={() => openModal("compensation", { employmentType: emp.employmentType ?? "FULL_TIME", jobTitle: emp.jobTitle ?? "" })}>
        <InfoRow label="Employee type" value={emp.employmentType ? EMP_TYPE_LABEL[emp.employmentType] : null} />
        <InfoRow label="Title" value={emp.jobTitle} />
      </InfoCard>

      <InfoCard icon={<User size={16} color="#6b7280" />} iconBg="#F3F4F6" title="Employment Status"
        onEdit={() => openModal("empstatus", { employmentType: emp.employmentType ?? "FULL_TIME", onProbation: emp.onProbation ?? false, probationEndDate: isoDate(emp.probationEndDate) })}>
        <InfoRow label="Status" value={emp.employmentType ? EMP_TYPE_LABEL[emp.employmentType] : null} />
        <InfoRow label="Probation" value={emp.onProbation ? "On Probation" : "Confirmed"} />
        {emp.probationEndDate && <InfoRow label="Probation End" value={fmtDate(emp.probationEndDate)} />}
      </InfoCard>

      <InfoCard icon={<Building2 size={16} color="#2563eb" />} iconBg="#EFF6FF" title="Workplace">
        <InfoRow label="Current Workplace" value={emp.workplace?.displayName ?? "Data Science Nigeria"} />
      </InfoCard>

      {emp.user?.role === "PROJECT_LEAD" && <PLDepartmentsCard emp={emp} />}
    </div>
  )
}

function TabPersonal({ emp, openModal, onUpload, uploadedDocs }: {
  emp: any; openModal: (k: string, d: any) => void
  onUpload: (key: string, accept?: string) => void; uploadedDocs: Record<string, string>
}) {
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"
  const isoDate = (d?: string | null) => d ? d.slice(0, 10) : ""

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="grid-2col" style={{ gap: 20 }}>
        <InfoCard icon={<User size={16} color="#2563eb" />} iconBg="#EFF6FF" title="Basic Details"
          onEdit={() => openModal("basic", {
            firstName: emp.firstName, lastName: emp.lastName, middleName: emp.middleName ?? "",
            phone: emp.phone ?? "", alternatePhone: emp.alternatePhone ?? "",
            gender: emp.gender ?? "", maritalStatus: emp.maritalStatus ?? "",
            dateOfBirth: isoDate(emp.dateOfBirth), personalEmail: emp.personalEmail ?? "",
            nationality: emp.nationality ?? "Nigerian", stateOfOrigin: emp.stateOfOrigin ?? "",
          })}>
          <InfoRow label="Full Name" value={`${emp.firstName}${emp.middleName ? " " + emp.middleName : ""} ${emp.lastName}`} />
          <InfoRow label="Birthday" value={fmtDate(emp.dateOfBirth)} />
          <InfoRow label="Gender" value={emp.gender ? (emp.gender === "MALE" ? "Male" : "Female") : null} />
          <InfoRow label="Nationality" value={emp.nationality ?? "Nigerian"} />
          <InfoRow label="State of Origin" value={emp.stateOfOrigin} />
          <InfoRow label="Email" value={emp.user?.email} />
          <InfoRow label="Phone" value={emp.phone} />
          <InfoRow label="Alt. Phone" value={emp.alternatePhone} />
          <InfoRow label="Marital Status" value={emp.maritalStatus ? emp.maritalStatus.charAt(0) + emp.maritalStatus.slice(1).toLowerCase() : null} />
          <InfoRow label="Start Date" value={fmtDate(emp.hireDate)} />
        </InfoCard>

        <InfoCard icon={<User size={16} color="#6b7280" />} iconBg="#F3F4F6" title="Next of Kin"
          onEdit={() => openModal("nok", { nokName: emp.nokName ?? "", nokRelationship: emp.nokRelationship ?? "", nokPhone: emp.nokPhone ?? "", nokAddress: emp.nokAddress ?? "" })}>
          <InfoRow label="Name" value={emp.nokName} />
          <InfoRow label="Relationship" value={emp.nokRelationship} />
          <InfoRow label="Phone Number" value={emp.nokPhone} />
          <InfoRow label="Address" value={emp.nokAddress} />
        </InfoCard>
      </div>

      <InfoCard icon={<MapPin size={16} color="#16a34a" />} iconBg="#DCFCE7" title="Home Address"
        onEdit={() => openModal("address", { address: emp.address ?? "", city: emp.city ?? "", state: emp.state ?? "", country: emp.country ?? "Nigeria", postalCode: emp.postalCode ?? "" })}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InfoRow label="Address Line 1" value={emp.address} />
          <InfoRow label="City" value={emp.city} />
          <InfoRow label="State" value={emp.state} />
          <InfoRow label="Country" value={emp.country ?? "Nigeria"} />
          <InfoRow label="Zip Code" value={emp.postalCode} />
        </div>
      </InfoCard>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Educational Certifications</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {([
            { key: "FIRST_DEGREE", label: "Degree" },
            { key: "PROFESSIONAL_CERT", label: "Professional Certificate" },
            { key: "NYSC", label: "NYSC" },
            { key: "SSCE", label: "SSCE" },
          ] as const).map(item => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--muted)", borderRadius: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: uploadedDocs[item.key] ? "var(--primary)" : "var(--muted-foreground)", fontWeight: uploadedDocs[item.key] ? 600 : 400 }}>
                  {uploadedDocs[item.key] ?? "No file uploaded."}
                </span>
                <button onClick={() => onUpload(item.key, ".pdf,.doc,.docx,.png,.jpg,.jpeg")}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                  <Upload size={11} /> Upload
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>General Information</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "aiMembership", label: "AI+ Membership", isFile: false, value: emp.aiMembership },
            { key: "nin", label: "NIN", isFile: false, value: emp.nin },
            { key: "UTILITY_BILL", label: "Utility Bill", isFile: true, value: null },
            { key: "OTHER", label: "Other Document", isFile: true, value: null },
          ].map(item => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--muted)", borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
              {item.isFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: uploadedDocs[item.key] ? "var(--primary)" : "var(--muted-foreground)", fontWeight: uploadedDocs[item.key] ? 600 : 400 }}>
                    {uploadedDocs[item.key] ?? "No file uploaded."}
                  </span>
                  <button onClick={() => onUpload(item.key, ".pdf,.doc,.docx,.png,.jpg,.jpeg")}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                    <Upload size={11} /> Upload
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: item.value ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: item.value ? 600 : 400 }}>
                    {item.value ?? <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#FEF3C7", color: "#92400e" }}>Missing data</span>}
                  </span>
                  <button onClick={() => openModal("customField", { fieldKey: item.key, label: item.label, response: item.value ?? "" })}
                    style={{ display: "flex", alignItems: "center", padding: "5px 8px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--muted-foreground)" }}>
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const REQUEST_TYPES = [
  { key: "leave", label: "Leave" },
  { key: "documents", label: "Documents" },
]

function TabRequest({ emp }: { emp: any }) {
  const [activeType, setActiveType] = useState("leave")
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!emp?.id) return
    setLoading(true); setRows([])
    const urls: Record<string, string> = {
      leave: `/api/leave?employeeId=${emp.id}`,
      documents: `/api/requests/documents?employeeId=${emp.id}`,
    }
    fetch(urls[activeType]).then(r => r.json())
      .then(d => { setRows(d.requests ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeType, emp?.id])

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"
  const statusBadge = (s: string) => {
    const m: Record<string, { bg: string; color: string }> = {
      PENDING: { bg: "#FEF3C7", color: "#92400e" },
      APPROVED: { bg: "#DCFCE7", color: "#15803d" },
      DECLINED: { bg: "#FEE2E2", color: "#DC2626" },
      READY: { bg: "#DCFCE7", color: "#15803d" },
      CANCELLED: { bg: "#F3F4F6", color: "#6B7280" },
    }
    const c = m[s] ?? { bg: "#F3F4F6", color: "#6B7280" }
    return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>{s}</span>
  }

  const recordRoutes: Record<string, string> = {
    leave: "/admin/requests/leave/record",
    documents: "/admin/requests/documents",
  }

  const activeLabel = REQUEST_TYPES.find(t => t.key === activeType)?.label ?? ""

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {REQUEST_TYPES.map(t => (
          <button key={t.key} onClick={() => setActiveType(t.key)}
            style={{ display: "block", width: "100%", padding: "11px 16px", background: activeType === t.key ? "var(--primary)" : "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: activeType === t.key ? 700 : 500, color: activeType === t.key ? "white" : "var(--foreground)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{activeLabel}</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => router.push(recordRoutes[activeType])}
              style={{ padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
              Record Request
            </button>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            No {activeLabel.toLowerCase()} found for this employee.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {activeType === "leave" && <>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Type</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Date</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Days</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Status</th>
                  </>}
                  {activeType === "documents" && <>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Details</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Date</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Status</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    {activeType === "leave" && <>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>{row.leaveType?.name ?? row.leaveTypeId}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{fmtDate(row.startDate)} – {fmtDate(row.endDate)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{row.days} day(s)</td>
                      <td style={{ padding: "12px 16px" }}>{statusBadge(row.status)}</td>
                    </>}
                    {activeType === "documents" && <>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>{row.documentType}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{fmtDate(row.createdAt)}</td>
                      <td style={{ padding: "12px 16px" }}>{statusBadge(row.status)}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function TabDocuments({ emp }: { emp: any }) {
  const [acks, setAcks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [preview, setPreview] = useState<{ title: string; fileUrl: string; mimeType?: string } | null>(null)

  useEffect(() => {
    fetch(`/api/employees/${emp.id}/documents`)
      .then(r => r.json())
      .then(d => { setAcks(d.acks ?? []); setLoading(false) })
  }, [emp.id])

  const filtered = acks.filter(a => {
    const q = search.toLowerCase()
    return !q || (a.document?.title ?? "").toLowerCase().includes(q)
  })

  const statusText = (a: any) => {
    if (!a.acknowledged) return "Pending"
    const date = new Date(a.acknowledgedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return a.document?.requiresSignature ? `Signed on ${date}` : `Acknowledged on ${date}`
  }

  const th: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "13px 16px", fontSize: 14, borderBottom: "1px solid var(--border)" }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>Employee Documents</div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>These documents are shared between {emp.firstName} {emp.lastName} and admins.</div>
      </div>

      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ position: "relative", maxWidth: 240 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" style={{ width: "100%", paddingLeft: 30, padding: "8px 12px 8px 30px", border: "1px solid var(--border)", borderRadius: 20, fontSize: 13, background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No documents assigned yet.</div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Document</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a: any) => (
                <tr key={a.id}>
                  <td style={td}>
                    <button
                      onClick={() => setPreview({ title: a.document?.title ?? "", fileUrl: a.document?.fileUrl ?? "", mimeType: a.document?.mimeType })}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, padding: 0 }}
                    >
                      <FileText size={14} color="#6B7280" />
                      {a.document?.title ?? "-"}
                    </button>
                  </td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{statusText(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
            1–{filtered.length} of {filtered.length} items
          </div>
        </>
      )}

      {/* Preview modal */}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 720, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Preview {preview.title}</div>
              <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflow: "hidden", minHeight: 300 }}>
              {preview.mimeType === "application/pdf" ? (
                <object data={`${preview.fileUrl}#toolbar=0`} type="application/pdf" style={{ width: "100%", height: "100%", border: "none", minHeight: 300 }}>
                  <div style={{ padding: 24, textAlign: "center", color: "#6B7280" }}>Unsupported file type</div>
                </object>
              ) : (
                <div style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: 14 }}>Unsupported file type</div>
              )}
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <a href={preview.fileUrl} download style={{ fontSize: 14, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>Download Document</a>
              <button onClick={() => setPreview(null)} style={{ padding: "8px 20px", border: "1px solid #E5E7EB", background: "white", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabAssets({ emp }: { emp: any }) {
  const router = useRouter()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/employees/${emp.id}/assets`)
      .then(r => r.ok ? r.json() : { assignments: [] })
      .then(d => { setAssignments(d.assignments ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [emp.id])

  const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    ASSIGNED: { bg: "#DCFCE7", color: "#15803d" },
    RETURNED: { bg: "#F3F4F6", color: "#6B7280" },
    LOST:     { bg: "#FEE2E2", color: "#DC2626" },
    DAMAGED:  { bg: "#FEF3C7", color: "#92400e" },
  }
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"
  const th: React.CSSProperties = { padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "12px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Assigned Assets</span>
        <button
          onClick={() => router.push(`/admin/assets/assignments/new?employeeId=${emp.id}`)}
          style={{ padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}
        >
          Add Asset
        </button>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={16} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} /></div>
      ) : assignments.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No assets assigned yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Asset</th><th style={th}>Type</th><th style={th}>Identifier</th><th style={th}>Assigned</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {assignments.map((a: any) => {
              const sc = STATUS_COLOR[a.status] ?? { bg: "#F3F4F6", color: "#6B7280" }
              return (
                <tr key={a.id}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{a.asset?.name ?? "-"}</span></td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{a.asset?.assetType?.name ?? "-"}</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{a.asset?.identifier ?? "-"}</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{fmtDate(a.assignedOn)}</td>
                  <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{a.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function TabDisciplinary({ emp }: { emp: any }) {
  const router = useRouter()
  const [violations, setViolations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/employees/${emp.id}/disciplinary`)
      .then(r => r.ok ? r.json() : { violations: [] })
      .then(d => { setViolations(d.violations ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [emp.id])

  const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    TO_REVIEW:  { bg: "#FEF3C7", color: "#92400e" },
    REVIEWED:   { bg: "#DBEAFE", color: "#1d4ed8" },
    DISMISSED:  { bg: "#F3F4F6", color: "#6B7280" },
    ESCALATED:  { bg: "#FEE2E2", color: "#DC2626" },
  }
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"
  const th: React.CSSProperties = { padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "12px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Disciplinary Records</span>
        <button
          onClick={() => router.push(`/admin/disciplinary/violations/new?employeeId=${emp.id}`)}
          style={{ padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}
        >
          Add Record
        </button>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={16} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} /></div>
      ) : violations.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No disciplinary records found.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Date</th><th style={th}>Type</th><th style={th}>Details</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {violations.map((v: any) => {
              const sc = STATUS_COLOR[v.status] ?? { bg: "#F3F4F6", color: "#6B7280" }
              return (
                <tr key={v.id}>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{fmtDate(v.incidentDate)}</td>
                  <td style={td}><span style={{ fontWeight: 600 }}>{v.violationType?.name ?? "-"}</span></td>
                  <td style={{ ...td, color: "var(--muted-foreground)", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.details}</td>
                  <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{v.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function TabLogs({ emp }: { emp: any }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/employees/${emp.id}/audit-logs`)
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => { setLogs(d.logs ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [emp.id])
  const fmtDate = (d: string) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"
  const th: React.CSSProperties = { padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "12px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Activity Logs</span>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={16} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} /></div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No activity logs found.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Action</th><th style={th}>By</th><th style={th}>Date</th></tr></thead>
          <tbody>
            {logs.map((l: any) => (
              <tr key={l.id}>
                <td style={td}>{l.action}</td>
                <td style={{ ...td, color: "var(--muted-foreground)" }}>{l.user?.name ?? "System"}</td>
                <td style={{ ...td, color: "var(--muted-foreground)" }}>{fmtDate(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function EmployeeProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { user: currentUser } = useCurrentUser()
  const canDelete = currentUser?.role === "SUPER_ADMIN" || (currentUser?.can("canDeleteEmployee") ?? false)
  const canChangeRole = currentUser?.role === "SUPER_ADMIN" || (currentUser?.can("canEditEmployee") ?? false)
  const [emp, setEmp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("Job")
  const [manageOpen, setManageOpen] = useState(false)
  const manageRef = useRef<HTMLDivElement>(null)

  // For modal dropdowns
  const [departments, setDepartments] = useState<any[]>([])
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [deptPLs, setDeptPLs] = useState<any[]>([])

  // Modal state
  const [modalKey, setModalKey] = useState<string | null>(null)
  const [modalForm, setModalForm] = useState<Record<string, any>>({})
  const [modalSaving, setModalSaving] = useState(false)
  const [modalErr, setModalErr] = useState("")

  // Manage state
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [roleChangeOpen, setRoleChangeOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"STAFF" | "PROJECT_LEAD">("STAFF")
  const [roleChanging, setRoleChanging] = useState(false)

  // Upload state
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({})
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentUploadKey = useRef<string>("")

  useEffect(() => {
    if (!id) return
    fetch(`/api/employees/${id}`)
      .then(r => r.json())
      .then(d => { setEmp(d.employee); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => setDepartments(d.departments ?? []))
    fetch("/api/employees?status=ACTIVE&limit=200").then(r => r.json()).then(d => setAllEmployees(d.employees ?? []))
    fetch("/api/people/managers").then(r => r.json()).then(d => setManagers(d.managers ?? []))
  }, [])

  useEffect(() => {
    if (modalKey !== "employment" || emp?.user?.role === "PROJECT_LEAD") return
    const deptId = modalForm.departmentId
    if (!deptId) { setDeptPLs([]); return }
    fetch(`/api/people/managers/pls-for-department?departmentId=${deptId}`)
      .then(r => r.json())
      .then(d => setDeptPLs(d.pls ?? []))
  }, [modalKey, modalForm.departmentId])

  useEffect(() => {
    if (!manageOpen) return
    const h = (e: MouseEvent) => { if (!manageRef.current?.contains(e.target as Node)) setManageOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [manageOpen])

  const openModal = (key: string, data: Record<string, any>) => {
    setModalKey(key); setModalForm(data); setModalErr("")
  }
  const closeModal = () => { setModalKey(null); setModalForm({}); setModalErr("") }

  const setMF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setModalForm(f => ({ ...f, [k]: e.target.value }))

  const saveModal = async () => {
    setModalSaving(true); setModalErr("")
    try {
      const r = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalForm),
      })
      const d = await r.json()
      if (!r.ok) { setModalErr(d.error ?? "Failed to save"); setModalSaving(false); return }
      setEmp(d.employee)
      closeModal()
    } catch {
      setModalErr("Network error, please try again")
    }
    setModalSaving(false)
  }

  const triggerUpload = (key: string, accept?: string) => {
    currentUploadKey.current = key
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept ?? "*"
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const key = currentUploadKey.current
    setUploadingKey(key)

    if (key === "PROFILE_PHOTO") {
      const fd = new FormData()
      fd.append("file", file)
      try {
        const r = await fetch(`/api/employees/${id}/photo`, { method: "POST", body: fd })
        if (r.ok) {
          const d = await r.json()
          setEmp((prev: any) => ({ ...prev, profilePhoto: d.photoUrl }))
        } else {
          const d = await r.json()
          setResetMsg({ ok: false, text: d.error ?? "Photo upload failed" })
          setTimeout(() => setResetMsg(null), 5000)
        }
      } catch {
        setResetMsg({ ok: false, text: "Photo upload failed - network error" })
        setTimeout(() => setResetMsg(null), 5000)
      }
      setUploadingKey(null)
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", key)
    try {
      const r = await fetch("/api/personal-docs", { method: "POST", body: formData })
      if (r.ok) {
        setUploadedDocs(d => ({ ...d, [key]: file.name }))
      } else {
        const d = await r.json()
        setResetMsg({ ok: false, text: d.error ?? "Upload failed" })
        setTimeout(() => setResetMsg(null), 5000)
      }
    } catch {
      setResetMsg({ ok: false, text: "Upload failed - network error" })
      setTimeout(() => setResetMsg(null), 5000)
    }
    setUploadingKey(null)
  }

  const doDelete = async () => {
    setDeleting(true)
    try {
      const r = await fetch(`/api/employees/${id}`, { method: "DELETE" })
      if (r.ok) {
        router.push("/admin/people/employees")
      } else {
        const d = await r.json()
        setResetMsg({ ok: false, text: d.error ?? "Failed to delete employee" })
        setTimeout(() => setResetMsg(null), 5000)
      }
    } catch {
      setResetMsg({ ok: false, text: "Delete failed - network error" })
      setTimeout(() => setResetMsg(null), 5000)
    }
    setDeleting(false)
    setDeleteConfirm(false)
  }

  const doChangeRole = async () => {
    if (!emp?.userId) return
    setRoleChanging(true)
    try {
      const r = await fetch(`/api/employees/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      })
      if (r.ok) {
        setEmp((prev: any) => ({ ...prev, user: { ...prev.user, role: selectedRole } }))
        setRoleChangeOpen(false)
        setResetMsg({ ok: true, text: `Role updated to ${selectedRole === "PROJECT_LEAD" ? "Project Lead" : "Staff"}. The employee must sign out and back in for the change to take effect.` })
        setTimeout(() => setResetMsg(null), 6000)
      } else {
        const d = await r.json()
        setResetMsg({ ok: false, text: d.error ?? "Failed to change role" })
        setTimeout(() => setResetMsg(null), 5000)
      }
    } catch {
      setResetMsg({ ok: false, text: "Role change failed - network error" })
      setTimeout(() => setResetMsg(null), 5000)
    }
    setRoleChanging(false)
  }

  const renderModal = () => {
    if (!modalKey || !emp) return null
    const mf = modalForm

    const modals: Record<string, { title: string; wide?: boolean; content: React.ReactNode }> = {
      basic: {
        title: "Edit Basic Details",
        wide: true,
        content: (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <MF label="First Name" required><input value={mf.firstName ?? ""} onChange={setMF("firstName")} style={fi} /></MF>
            <MF label="Last Name" required><input value={mf.lastName ?? ""} onChange={setMF("lastName")} style={fi} /></MF>
            <MF label="Middle Name"><input value={mf.middleName ?? ""} onChange={setMF("middleName")} style={fi} /></MF>
            <MF label="Date of Birth"><input type="date" value={mf.dateOfBirth ?? ""} onChange={setMF("dateOfBirth")} max={maxDob} style={fi} /></MF>
            <MF label="Gender">
              <select value={mf.gender ?? ""} onChange={setMF("gender")} style={{ ...fi, appearance: "none" }}>
                <option value="">Select…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </MF>
            <MF label="Marital Status">
              <select value={mf.maritalStatus ?? ""} onChange={setMF("maritalStatus")} style={{ ...fi, appearance: "none" }}>
                <option value="">Select…</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            </MF>
            <MF label="Nationality"><input value={mf.nationality ?? ""} onChange={setMF("nationality")} style={fi} placeholder="e.g. Nigerian" /></MF>
            <MF label="State of Origin"><input value={mf.stateOfOrigin ?? ""} onChange={setMF("stateOfOrigin")} style={fi} placeholder="e.g. Lagos" /></MF>
            <MF label="Phone Number"><input value={mf.phone ?? ""} onChange={setMF("phone")} style={fi} placeholder="e.g. 08012345678" /></MF>
            <MF label="Alternate Phone"><input value={mf.alternatePhone ?? ""} onChange={setMF("alternatePhone")} style={fi} placeholder="Optional" /></MF>
            <MF label="Personal Email"><input type="email" value={mf.personalEmail ?? ""} onChange={setMF("personalEmail")} style={fi} /></MF>
          </div>
        ),
      },
      nok: {
        title: "Edit Next of Kin",
        content: (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <MF label="Full Name" required><input value={mf.nokName ?? ""} onChange={setMF("nokName")} style={fi} /></MF>
            <MF label="Relationship"><input value={mf.nokRelationship ?? ""} onChange={setMF("nokRelationship")} style={fi} placeholder="e.g. Spouse" /></MF>
            <MF label="Phone Number" required><input value={mf.nokPhone ?? ""} onChange={setMF("nokPhone")} style={fi} placeholder="e.g. 08012345678" /></MF>
            <div style={{ gridColumn: "1 / -1" }}>
              <MF label="Address"><input value={mf.nokAddress ?? ""} onChange={setMF("nokAddress")} style={fi} placeholder="Next of kin's address" /></MF>
            </div>
          </div>
        ),
      },
      address: {
        title: "Edit Home Address",
        wide: true,
        content: (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <MF label="Address Line 1" required><input value={mf.address ?? ""} onChange={setMF("address")} style={fi} placeholder="Street address" /></MF>
            <MF label="Country" required><input value={mf.country ?? ""} onChange={setMF("country")} style={fi} placeholder="e.g. Nigeria" /></MF>
            <MF label="City"><input value={mf.city ?? ""} onChange={setMF("city")} style={fi} placeholder="e.g. Lagos" /></MF>
            <MF label="State / Province" required><input value={mf.state ?? ""} onChange={setMF("state")} style={fi} placeholder="e.g. Lagos" /></MF>
            <MF label="Zip Code"><input value={mf.postalCode ?? ""} onChange={setMF("postalCode")} style={fi} placeholder="e.g. 100001" /></MF>
          </div>
        ),
      },
      employment: {
        title: "Edit Employment Details",
        wide: true,
        content: (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <MF label="Department">
              <select value={mf.departmentId ?? ""} onChange={setMF("departmentId")} style={{ ...fi, appearance: "none" }}>
                <option value="">Select department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </MF>
            <MF label={emp.user?.role === "PROJECT_LEAD" ? "Manager" : "Project Lead"}>
              <select value={mf.managerId ?? ""} onChange={setMF("managerId")} style={{ ...fi, appearance: "none" }}>
                <option value="">{emp.user?.role === "PROJECT_LEAD" ? "No manager" : deptPLs.length === 0 && modalForm.departmentId ? "No project lead in this department" : "No project lead"}</option>
                {emp.user?.role === "PROJECT_LEAD"
                  ? managers.map((m: any) => m.employee
                      ? <option key={m.employee.id} value={m.employee.id}>{m.employee.firstName} {m.employee.lastName}</option>
                      : null)
                  : deptPLs.map(e =>
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)
                }
              </select>
            </MF>
            <MF label="Hire Date"><input type="date" value={mf.hireDate ?? ""} onChange={setMF("hireDate")} style={fi} /></MF>
            {((emp.jobTitle ?? "").toLowerCase().includes("intern") || emp.employmentType === "INTERN") && (
              <MF label="Intern Report Start Date">
                <input type="date" value={mf.internReportStartDate ?? ""} onChange={setMF("internReportStartDate")} style={fi} />
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                  First week this intern is required to submit weekly reports. Leave blank to use their account creation date - set this if they shouldn't be on the hook for earlier weeks (e.g. onboarding delay).
                </div>
              </MF>
            )}
          </div>
        ),
      },
      compensation: {
        title: "Edit Employment Details",
        wide: true,
        content: (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <MF label="Employment Type">
              <select value={mf.employmentType ?? ""} onChange={setMF("employmentType")} style={{ ...fi, appearance: "none" }}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </MF>
            <MF label="Job Title"><input value={mf.jobTitle ?? ""} onChange={setMF("jobTitle")} style={fi} placeholder="e.g. Senior Engineer" /></MF>
          </div>
        ),
      },
      empstatus: {
        title: "Edit Employment Status",
        content: (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <MF label="Employment Type">
              <select value={mf.employmentType ?? ""} onChange={setMF("employmentType")} style={{ ...fi, appearance: "none" }}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </MF>
            <MF label="Probation">
              <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                {[{ v: false, l: "Confirmed" }, { v: true, l: "On Probation" }].map(o => (
                  <label key={String(o.v)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                    <input type="radio" checked={mf.onProbation === o.v} onChange={() => setModalForm(f => ({ ...f, onProbation: o.v }))} style={{ accentColor: "var(--primary)" }} />
                    {o.l}
                  </label>
                ))}
              </div>
            </MF>
            {mf.onProbation && (
              <MF label="Probation End Date"><input type="date" value={mf.probationEndDate ?? ""} onChange={setMF("probationEndDate")} style={fi} /></MF>
            )}
          </div>
        ),
      },
      customField: {
        title: "Custom Field Information",
        content: (
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{mf.label}</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>{mf.label}</p>
            <MF label="Response">
              <input value={mf.response ?? ""} onChange={e => setModalForm(f => ({ ...f, response: e.target.value, [mf.fieldKey]: e.target.value }))} style={fi} />
            </MF>
          </div>
        ),
      },
    }

    const m = modals[modalKey]
    if (!m) return null
    return (
      <Modal title={m.title} onClose={closeModal} onSave={saveModal} saving={modalSaving} err={modalErr} wide={m.wide}>
        {m.content}
      </Modal>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <Loader2 size={28} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!emp) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Employee not found</p>
          <button onClick={() => router.push("/admin/people/employees")} style={{ padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>Back to Employees</button>
        </div>
      </div>
    )
  }

  const badge = STATUS_BADGE[emp.employeeStatus] ?? { bg: "#F3F4F6", color: "#6B7280", label: emp.employeeStatus }
  const fullName = `${emp.firstName}${emp.middleName ? " " + emp.middleName : ""} ${emp.lastName}`

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Hidden file input for uploads */}
      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileSelected} />

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 32px", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/admin/people/employees")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/people/employees")}>Employees</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 14 }}>›</span>
        <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Employee Profile</span>
      </div>

      {/* Profile Banner */}
      <div style={{ background: "#0f2744", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 75%)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ position: "relative", padding: "28px 32px 0", display: "flex", alignItems: "flex-end", gap: 20 }}>
          <div onClick={() => triggerUpload("PROFILE_PHOTO", "image/jpeg,image/png,image/webp")} style={{ flexShrink: 0, position: "relative", cursor: "pointer" }}>
            <Av name={fullName} photo={emp.profilePhoto} size={84} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0"}>
              <span style={{ fontSize: 11, color: "white", fontWeight: 700 }}>Edit</span>
            </div>
          </div>
          <div style={{ flex: 1, paddingBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: 0 }}>{fullName}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color }}>{badge.label}</span>
              {emp.user?.role === "PROJECT_LEAD" && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}>Project Lead</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {emp.jobTitle && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{emp.jobTitle}</span>}
              {emp.employmentType && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>· {EMP_TYPE_LABEL[emp.employmentType]}</span>}
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "rgba(37,99,235,0.35)", color: "#93c5fd" }}>Data Science Nigeria</span>
              {emp.phone && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{emp.phone}</span>}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{emp.employeeId}</div>
          </div>
          <div ref={manageRef} style={{ position: "relative", paddingBottom: 20, flexShrink: 0 }}>
            <button onClick={() => setManageOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
              Manage <ChevronDown size={14} />
            </button>
            {manageOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50, minWidth: 190, padding: "4px 0" }}>
                {canChangeRole && emp?.userId && (
                  <button onClick={() => {
                    setManageOpen(false)
                    setSelectedRole((emp.user?.role === "PROJECT_LEAD" ? "STAFF" : "PROJECT_LEAD") as "STAFF" | "PROJECT_LEAD")
                    setRoleChangeOpen(true)
                  }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
                    <UserCog size={13} style={{ flexShrink: 0 }} /> Change Role
                  </button>
                )}
                <button onClick={async () => {
                    setManageOpen(false)
                    try {
                      const r = await fetch(`/api/employees/${id}/reset-password`, { method: "POST" })
                      if (r.ok) {
                        setResetMsg({ ok: true, text: "Password reset. Employee will be prompted to change it on next login." })
                      } else {
                        const d = await r.json()
                        setResetMsg({ ok: false, text: d.error ?? "Reset failed" })
                      }
                    } catch {
                      setResetMsg({ ok: false, text: "Reset failed - network error" })
                    }
                    setTimeout(() => setResetMsg(null), 5000)
                  }}
                  style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
                  Reset Password
                </button>
                {canDelete && (
                  <>
                    <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                    <button onClick={() => { setManageOpen(false); setDeleteConfirm(true) }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#DC2626", textAlign: "left" }}>
                      Delete Employee
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 0, padding: "0 32px", overflowX: "auto" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "12px 18px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? "white" : "rgba(255,255,255,0.5)", borderBottom: activeTab === tab ? "2px solid white" : "2px solid transparent", whiteSpace: "nowrap", transition: "all .15s" }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px" }}>
        {activeTab === "Job" && <TabJobPay emp={emp} openModal={openModal} />}
        {activeTab === "Personal" && <TabPersonal emp={emp} openModal={openModal} onUpload={triggerUpload} uploadedDocs={uploadedDocs} />}
        {activeTab === "Request" && <TabRequest emp={emp} />}
        {activeTab === "Documents" && <TabDocuments emp={emp} />}
        {activeTab === "Assets" && <TabAssets emp={emp} />}
        {activeTab === "Disciplinary" && <TabDisciplinary emp={emp} />}
        {activeTab === "Logs" && <TabLogs emp={emp} />}
      </div>

      {/* Reset password toast */}
      {resetMsg && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500, padding: "12px 20px", borderRadius: 10, background: resetMsg.ok ? "#DCFCE7" : "#FEE2E2", color: resetMsg.ok ? "#15803d" : "#DC2626", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", maxWidth: 360 }}>
          {resetMsg.text}
        </div>
      )}

      {/* Modal overlay */}
      {renderModal()}

      {/* Upload spinner overlay */}
      {uploadingKey && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: "24px 32px", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600 }}>
            <Loader2 size={20} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} />
            Uploading…
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: "#DC2626" }}>Delete Employee</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 8 }}>
              Are you sure you want to permanently delete <strong>{emp?.firstName} {emp?.lastName}</strong>?
            </p>
            <p style={{ fontSize: 13, color: "#DC2626", marginBottom: 24, fontWeight: 600 }}>
              This action cannot be undone. All employee data, records, and history will be removed.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(false)} disabled={deleting} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doDelete} disabled={deleting} style={{ padding: "9px 20px", background: "#DC2626", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                {deleting ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Deleting…</> : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleChangeOpen && emp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Change Role</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
              Change the role of <strong>{emp.firstName} {emp.lastName}</strong> from{" "}
              <strong>{(emp.user?.role ?? "STAFF") === "PROJECT_LEAD" ? "Project Lead" : "Staff"}</strong> to{" "}
              <strong>{selectedRole === "PROJECT_LEAD" ? "Project Lead" : "Staff"}</strong>?
            </p>
            <div style={{ padding: "14px 16px", borderRadius: 10, border: "2px solid var(--primary)", background: "rgba(37,99,235,0.05)", marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{selectedRole === "PROJECT_LEAD" ? "Project Lead" : "Staff"}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{selectedRole === "PROJECT_LEAD" ? "Can approve leave requests for their assigned departments. Access to the Project Lead portal." : "Standard employee access. Leave requests routed to their Project Lead."}</div>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20 }}>The employee must sign out and back in for this change to take effect.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setRoleChangeOpen(false)} disabled={roleChanging} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doChangeRole} disabled={roleChanging} style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: roleChanging ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                {roleChanging ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
