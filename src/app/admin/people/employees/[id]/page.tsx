"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ChevronLeft, ChevronDown, Edit2, Upload, Loader2,
  Building2, User, CreditCard, FileText, Briefcase, MapPin,
  Receipt, Shield, X,
} from "lucide-react"

const TABS = ["Job & Pay", "Personal", "Request", "Documents", "Benefits", "Assets", "Tasks", "Disciplinary", "Notes", "Logs"]

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:     { bg: "#DCFCE7", color: "#16a34a", label: "Active" },
  ON_LEAVE:   { bg: "#FEF3C7", color: "#D97706", label: "On Leave" },
  TERMINATED: { bg: "#FEE2E2", color: "#DC2626", label: "Inactive" },
  RESIGNED:   { bg: "#F3F4F6", color: "#6B7280", label: "Resigned" },
  SUSPENDED:  { bg: "#FEF3C7", color: "#D97706", label: "Suspended" },
}

const EMP_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time",
  CONTRACT: "Contract", INTERN: "Intern", NYSC: "NYSC",
}

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

function Modal({ title, onClose, onSave, saving, err, wide, children }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; err: string; wide?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: wide ? 680 : 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "24px" }}>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
            This information is used for Payroll, Benefits, and HR, so please make sure it's accurate.
          </p>
          {children}
        </div>
        {err && <div style={{ margin: "0 24px 16px", padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
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
        {value ?? "—"}
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

function TabJobPay({ emp, openModal }: { emp: any; openModal: (k: string, d: any) => void }) {
  const fmt = (n?: number | null) => n != null ? `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : "—"
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
  const isoDate = (d?: string | null) => d ? d.slice(0, 10) : ""

  return (
    <div className="grid-2col" style={{ gap: 20 }}>
      <InfoCard icon={<Briefcase size={16} color="#16a34a" />} iconBg="#DCFCE7" title="Employment Details"
        onEdit={() => openModal("employment", { departmentId: emp.department?.id ?? "", managerId: emp.manager?.id ?? "", hireDate: isoDate(emp.hireDate) })}>
        <InfoRow label="Department" value={emp.department?.name} />
        <InfoRow label="Manager" value={emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : null} />
        <InfoRow label="Start Date" value={fmtDate(emp.hireDate)} />
        <InfoRow label="Employee No." value={emp.employeeId} />
      </InfoCard>

      <InfoCard icon={<CreditCard size={16} color="#6b7280" />} iconBg="#F3F4F6" title="Compensation"
        onEdit={() => openModal("compensation", { employmentType: emp.employmentType ?? "FULL_TIME", jobTitle: emp.jobTitle ?? "", grossSalary: emp.grossSalary ?? "" })}>
        <InfoRow label="Employee type" value={emp.employmentType ? EMP_TYPE_LABEL[emp.employmentType] : null} />
        <InfoRow label="Title" value={emp.jobTitle} />
        <InfoRow label="Payband" value={emp.payband ?? "—"} />
        <InfoRow label="Gross pay" value={fmt(emp.grossSalary)} />
      </InfoCard>

      <InfoCard icon={<Receipt size={16} color="#d97706" />} iconBg="#FEF3C7" title="Payment Method"
        onEdit={() => openModal("payment", { bankName: emp.bankName ?? "", bankAccountNo: emp.bankAccountNo ?? "", bankAccountName: emp.bankAccountName ?? "" })}>
        {emp.bankName || emp.bankAccountNo ? (
          <>
            <InfoRow label="Payment Method" value="Direct Deposit" />
            <InfoRow label="Bank" value={emp.bankName} />
            <InfoRow label="Account No." value={emp.bankAccountNo} />
            <InfoRow label="Account Name" value={emp.bankAccountName} />
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#FEF3C7", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
              Payouts will be made into this Primary Account
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No payment method configured</p>
        )}
      </InfoCard>

      <InfoCard icon={<FileText size={16} color="#d97706" />} iconBg="#FEF3C7" title="Payslips">
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No payslips available</p>
        <button style={{ marginTop: 4, padding: "6px 14px", background: "var(--primary)", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white" }}>
          View Payslip
        </button>
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

      <InfoCard icon={<Receipt size={16} color="#d97706" />} iconBg="#FEF3C7" title="Tax Info"
        onEdit={() => openModal("tax", { tin: emp.tin ?? "" })}>
        <InfoRow label="TIN" value={emp.tin} />
      </InfoCard>

      <InfoCard icon={<Shield size={16} color="#d97706" />} iconBg="#FEF3C7" title="Pension"
        onEdit={() => openModal("pension", { pensionPin: emp.pensionPin ?? "" })}>
        <InfoRow label="Pension PIN" value={emp.pensionPin} />
        <InfoRow label="EVC" value="₦0.00" />
      </InfoCard>

      <div style={{ gridColumn: "1 / -1" }}>
        <InfoCard icon={<Shield size={16} color="#6b7280" />} iconBg="#F3F4F6" title="NHF"
          onEdit={() => openModal("nhf", { nhfNo: emp.nhfNo ?? "" })}>
          <InfoRow label="NHF Number" value={emp.nhfNo} />
        </InfoCard>
      </div>
    </div>
  )
}

function TabPersonal({ emp, openModal, onUpload, uploadedDocs }: {
  emp: any; openModal: (k: string, d: any) => void
  onUpload: (key: string, accept?: string) => void; uploadedDocs: Record<string, string>
}) {
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
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
          <InfoRow label="Email" value={emp.workEmail} />
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
  { key: "salary-advances", label: "Salary Advances" },
  { key: "loans", label: "Loans" },
  { key: "leave", label: "Leave" },
  { key: "exits", label: "Exits" },
  { key: "redeployments", label: "Redeployments" },
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
      leave: `/api/leave/requests?employeeId=${emp.id}&limit=50`,
      exits: `/api/requests/exits?employeeId=${emp.id}`,
      loans: `/api/requests/loans?employeeId=${emp.id}`,
      "salary-advances": `/api/requests/salary-advances?employeeId=${emp.id}`,
      redeployments: `/api/requests/redeployments?employeeId=${emp.id}`,
      documents: `/api/requests/documents?employeeId=${emp.id}`,
    }
    const keys: Record<string, string> = {
      leave: "requests", exits: "requests", loans: "loans",
      "salary-advances": "advances", redeployments: "requests", documents: "requests",
    }
    fetch(urls[activeType]).then(r => r.json())
      .then(d => { setRows(d[keys[activeType]] ?? d.leaveRequests ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeType, emp?.id])

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"
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
    "salary-advances": "/admin/requests/salary-advances/record",
    loans: "/admin/requests/loans/record",
    leave: "/admin/requests/leave/record",
    exits: "/admin/requests/exits/record",
    redeployments: "/admin/requests/redeployments",
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
            {activeType === "leave" && (
              <button onClick={() => router.push(`/admin/people/employees/${emp.id}/leave-balances`)}
                style={{ padding: "7px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Leave Balances
              </button>
            )}
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
                  {(activeType === "loans" || activeType === "salary-advances") && <>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Amount</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Date</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Status</th>
                  </>}
                  {(activeType === "exits" || activeType === "redeployments" || activeType === "documents") && <>
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
                    {(activeType === "loans" || activeType === "salary-advances") && <>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>₦{Number(row.amount).toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{fmtDate(row.createdAt)}</td>
                      <td style={{ padding: "12px 16px" }}>{statusBadge(row.status)}</td>
                    </>}
                    {(activeType === "exits" || activeType === "redeployments" || activeType === "documents") && <>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>
                        {activeType === "exits" ? row.exitType : activeType === "documents" ? row.documentType : `${row.fromJobTitle ?? "—"} → ${row.toJobTitle ?? "—"}`}
                      </td>
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

function TabDocuments() {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Shared Documents</span>
        <button style={{ padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>Add Document</button>
      </div>
      <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No documents found.</div>
    </div>
  )
}

function TabBenefits({ emp }: { emp: any }) {
  const sections = [
    { title: "PFA / Pension", icon: <Shield size={16} color="#d97706" />, iconBg: "#FEF3C7",
      rows: [{ label: "Pension PIN", value: emp.pensionPin }, { label: "EVC (Annual)", value: "₦0.00" }, { label: "Employer Contribution", value: "₦0.00" }] },
    { title: "Medical / HMO", icon: <User size={16} color="#16a34a" />, iconBg: "#DCFCE7",
      rows: [{ label: "HMO Provider", value: null }, { label: "HMO Number", value: null }, { label: "Plan", value: null }] },
    { title: "NHF", icon: <Shield size={16} color="#6b7280" />, iconBg: "#F3F4F6",
      rows: [{ label: "NHF Number", value: emp.nhfNo }, { label: "Contribution Rate", value: "2.5%" }] },
  ]
  return (
    <div className="grid-2col" style={{ gap: 20 }}>
      {sections.map(s => (
        <InfoCard key={s.title} icon={s.icon} iconBg={s.iconBg} title={s.title}>
          {s.rows.map(r => <InfoRow key={r.label} label={r.label} value={r.value} />)}
        </InfoCard>
      ))}
    </div>
  )
}

function TabAssets({ emp }: { emp: any }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Assigned Assets</span>
        <button style={{ padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>Add Asset</button>
      </div>
      <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No assets assigned yet.</div>
    </div>
  )
}

function TabTasks({ emp }: { emp: any }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<"ONBOARDING" | "ROUTINE">("ONBOARDING")

  useEffect(() => {
    fetch(`/api/employees/${emp.id}/onboarding-tasks`)
      .then(r => r.ok ? r.json() : { tasks: [] })
      .then(d => { setTasks(d.tasks ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [emp.id])

  const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    PENDING: { bg: "#FEF3C7", color: "#92400e" },
    IN_PROGRESS: { bg: "#DBEAFE", color: "#1d4ed8" },
    COMPLETED: { bg: "#DCFCE7", color: "#15803d" },
    OVERDUE: { bg: "#FEE2E2", color: "#DC2626" },
  }
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"
  const th: React.CSSProperties = { padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "12px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["ONBOARDING", "ROUTINE"] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              style={{ padding: "7px 16px", background: subTab === t ? "var(--primary)" : "var(--muted)", border: subTab === t ? "none" : "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: subTab === t ? "white" : "var(--foreground)" }}>
              {t === "ONBOARDING" ? "Onboarding" : "Routine"}
            </button>
          ))}
        </div>
        <button style={{ padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>Assign Task</button>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={16} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} /></div>
      ) : tasks.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No tasks assigned yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Task</th><th style={th}>Category</th><th style={th}>Due Date</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {tasks.map((t: any) => {
              const sc = STATUS_COLOR[t.status] ?? { bg: "#F3F4F6", color: "#6B7280" }
              return (
                <tr key={t.id}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{t.title}</span></td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{t.category}</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{fmtDate(t.dueDate)}</td>
                  <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{t.status}</span></td>
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

function TabDisciplinary() {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Disciplinary Records</span>
        <button style={{ padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>Add Record</button>
      </div>
      <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No disciplinary records found.</div>
    </div>
  )
}

function TabNotes({ emp }: { emp: any }) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const saveNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false); setSaved(true); setNote("")
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Add Note</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={5} placeholder="Write a note about this employee…"
          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
          {saved && <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>Note saved!</span>}
          <button onClick={saveNote} disabled={!note.trim() || saving}
            style={{ padding: "8px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: note.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, color: "white", opacity: note.trim() ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            {saving ? "Saving…" : "Save Note"}
          </button>
        </div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No notes yet.</div>
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
  const fmtDate = (d: string) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"
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
  const [emp, setEmp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("Job & Pay")
  const [manageOpen, setManageOpen] = useState(false)
  const manageRef = useRef<HTMLDivElement>(null)

  // For modal dropdowns
  const [departments, setDepartments] = useState<any[]>([])
  const [allEmployees, setAllEmployees] = useState<any[]>([])

  // Modal state
  const [modalKey, setModalKey] = useState<string | null>(null)
  const [modalForm, setModalForm] = useState<Record<string, any>>({})
  const [modalSaving, setModalSaving] = useState(false)
  const [modalErr, setModalErr] = useState("")

  // Manage state
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
  }, [])

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
          alert(d.error ?? "Photo upload failed")
        }
      } catch {
        alert("Photo upload failed — network error")
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
        alert(d.error ?? "Upload failed")
      }
    } catch {
      alert("Upload failed — network error")
    }
    setUploadingKey(null)
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
            <MF label="Date of Birth"><input type="date" value={mf.dateOfBirth ?? ""} onChange={setMF("dateOfBirth")} style={fi} /></MF>
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
            <MF label="Manager">
              <select value={mf.managerId ?? ""} onChange={setMF("managerId")} style={{ ...fi, appearance: "none" }}>
                <option value="">No manager</option>
                {allEmployees.filter(e => e.id !== id).map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </MF>
            <MF label="Hire Date"><input type="date" value={mf.hireDate ?? ""} onChange={setMF("hireDate")} style={fi} /></MF>
          </div>
        ),
      },
      compensation: {
        title: "Edit Compensation",
        wide: true,
        content: (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <MF label="Employment Type">
              <select value={mf.employmentType ?? ""} onChange={setMF("employmentType")} style={{ ...fi, appearance: "none" }}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
                <option value="NYSC">NYSC</option>
              </select>
            </MF>
            <MF label="Job Title"><input value={mf.jobTitle ?? ""} onChange={setMF("jobTitle")} style={fi} placeholder="e.g. Senior Engineer" /></MF>
            <MF label="Gross Salary (₦)" required>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--muted-foreground)" }}>₦</span>
                <input type="number" value={mf.grossSalary ?? ""} onChange={setMF("grossSalary")} style={{ ...fi, paddingLeft: 28 }} placeholder="e.g. 5000000" />
              </div>
            </MF>
          </div>
        ),
      },
      payment: {
        title: "Edit Payment Method",
        wide: true,
        content: (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <MF label="Bank Name" required><input value={mf.bankName ?? ""} onChange={setMF("bankName")} style={fi} placeholder="e.g. GTBank" /></MF>
            <MF label="Account Number" required><input value={mf.bankAccountNo ?? ""} onChange={setMF("bankAccountNo")} style={fi} placeholder="e.g. 0123456789" /></MF>
            <div style={{ gridColumn: "1 / -1" }}>
              <MF label="Account Name"><input value={mf.bankAccountName ?? ""} onChange={setMF("bankAccountName")} style={fi} placeholder="Full name as on account" /></MF>
            </div>
            <div style={{ gridColumn: "1 / -1", padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 12, color: "#92400E" }}>
              ⚠ Please be careful entering this info. DSN HRMS won't be liable for payments made into wrong accounts.
            </div>
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
                <option value="NYSC">NYSC</option>
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
      tax: {
        title: "Edit Tax Info",
        content: <MF label="Tax Identification Number"><input value={mf.tin ?? ""} onChange={setMF("tin")} style={fi} placeholder="TIN" /></MF>,
      },
      pension: {
        title: "Edit Pension",
        content: <MF label="Pension PIN"><input value={mf.pensionPin ?? ""} onChange={setMF("pensionPin")} style={fi} placeholder="e.g. PEN123456789012" /></MF>,
      },
      nhf: {
        title: "Edit NHF",
        content: (
          <div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>This information is used to remit NHF contributions, so please make sure it's accurate.</p>
            <MF label="NHF Number"><input value={mf.nhfNo ?? ""} onChange={setMF("nhfNo")} style={fi} placeholder="NHF Number" /></MF>
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
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50, minWidth: 180, padding: "4px 0" }}>
                <button style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
                  Remove Profile
                </button>
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
                      setResetMsg({ ok: false, text: "Reset failed — network error" })
                    }
                    setTimeout(() => setResetMsg(null), 5000)
                  }}
                  style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
                  Reset Password
                </button>
                <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                <button style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#DC2626", textAlign: "left" }}>
                  Delete
                </button>
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
        {activeTab === "Job & Pay" && <TabJobPay emp={emp} openModal={openModal} />}
        {activeTab === "Personal" && <TabPersonal emp={emp} openModal={openModal} onUpload={triggerUpload} uploadedDocs={uploadedDocs} />}
        {activeTab === "Request" && <TabRequest emp={emp} />}
        {activeTab === "Documents" && <TabDocuments />}
        {activeTab === "Benefits" && <TabBenefits emp={emp} />}
        {activeTab === "Assets" && <TabAssets emp={emp} />}
        {activeTab === "Tasks" && <TabTasks emp={emp} />}
        {activeTab === "Disciplinary" && <TabDisciplinary />}
        {activeTab === "Notes" && <TabNotes emp={emp} />}
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

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
