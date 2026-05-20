"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Check, Loader2, Search, X, ChevronDown, Users, UserCog, AlertCircle, Info } from "lucide-react"

const STEPS = ["Basic Information", "Personal Details", "Documents", "Welcome Options"]
const STATUSES = ["Full-time", "Part-time", "Contract"]
const GENDERS = ["Male", "Female"]
const MARITAL = ["Single", "Married", "Divorced", "Widowed"]

function SearchableSelect({ label, value, onChange, options, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string; required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
  const selected = options.find(o => o.value === value)
  const fi: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      <button type="button" onClick={() => { setOpen(o => !o); setQ("") }}
        style={{ ...fi, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
        <span style={{ color: selected ? "var(--foreground)" : "var(--muted-foreground)" }}>{selected?.label ?? placeholder ?? "Select…"}</span>
        <ChevronDown size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 220, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 6, padding: "6px 10px" }}>
              <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
                style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", flex: 1, color: "var(--foreground)" }} />
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>No results</div>
            ) : filtered.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQ("") }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", background: value === o.value ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>
                {value === o.value && <Check size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />}
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32, padding: "0 24px" }}>
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: done ? "#16a34a" : active ? "var(--primary)" : "var(--muted)",
                border: `2px solid ${done ? "#16a34a" : active ? "var(--primary)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: done || active ? "white" : "var(--muted-foreground)",
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>
                {done ? <Check size={16} /> : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "var(--foreground)" : "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#16a34a" : "var(--border)", margin: "0 8px", marginTop: -22 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400, marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export default function AddNewMemberPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromUserId = searchParams?.get("fromUser") ?? null

  const [onboardMode, setOnboardMode] = useState<"employee" | "me" | null>(null)
  const [selectedCard, setSelectedCard] = useState<"employee" | "me" | null>(null)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const [workplaces, setWorkplaces] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [jobTitles, setJobTitles] = useState<any[]>([])
  const [orgDocs, setOrgDocs] = useState<any[]>([])

  // Hire flow — pre-fill from existing external admin user
  const [fromUserLoading, setFromUserLoading] = useState(!!fromUserId)
  const [fromUserErr, setFromUserErr] = useState("")

  // Role-aware picker state
  const [pls, setPls] = useState<any[]>([])                  // PLs for the chosen primary department (STAFF)
  const [plsLoading, setPlsLoading] = useState(false)
  const [managers, setManagers] = useState<any[]>([])        // Manager-table entries (PROJECT_LEAD picker)
  const [secondaryDeptStatus, setSecondaryDeptStatus] = useState<Record<string, "has-pl" | "no-pl">>({})

  // Step 0: Basic Info + Employment Details
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    workplaceId: "", email: "",
    primaryDepartmentId: "",                  // STAFF — primary dept
    primaryProjectLeadId: "",                 // STAFF — primary PL (must be PL of primary dept)
    secondaryDepartmentIds: [] as string[],   // STAFF — optional secondary depts
    departmentIds: [] as string[],            // PROJECT_LEAD — multi-dept they lead
    managerEmployeeId: "",                    // PROJECT_LEAD — their manager (must be Manager-table entry)
    hireDate: "", phone: "", employeeNumber: "",
    jobTitle: "", employmentStatus: "Full-time", role: "STAFF",
  })

  // Step 1: Personal Details
  const [personal, setPersonal] = useState({
    birthday: "", gender: "", maritalStatus: "", phone2: "",
    recoveryEmail: "", showPhone: true,
    address1: "", address2: "", country: "", city: "", state: "", zip: "",
    nokName: "", nokRelationship: "", nokEmail: "", nokPhone: "",
  })

  // Step 2: Documents
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])

  const [emailChecking, setEmailChecking] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)

  // Invite mode state
  const [inviteForm, setInviteForm] = useState({
    firstName: "", lastName: "", email: "", hireDate: "", jobTitle: "", gender: "", dateOfBirth: "", role: "STAFF",
    primaryDepartmentId: "", primaryProjectLeadId: "", secondaryDepartmentIds: [] as string[],
    departmentIds: [] as string[], managerEmployeeId: "",
  })
  const [invitePls, setInvitePls] = useState<any[]>([])
  const [inviteSecDeptStatus, setInviteSecDeptStatus] = useState<Record<string, "has-pl" | "no-pl">>({})
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteErr, setInviteErr] = useState("")
  const [inviteEmailChecking, setInviteEmailChecking] = useState(false)
  const [inviteEmailAvailable, setInviteEmailAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/company-details/workplaces").then(r => r.json()),
      fetch("/api/settings").then(r => r.json()),
      fetch("/api/job-titles").then(r => r.json()),
      fetch("/api/people/managers").then(r => r.json()),
    ]).then(([w, s, jt, m]) => {
      setWorkplaces(w.workplaces ?? [])
      setDepartments(s.departments ?? [])
      setJobTitles(jt.jobTitles ?? [])
      setManagers(m.managers ?? [])
    })
    fetch("/api/org-documents").then(r => r.json()).then(d => setOrgDocs(d.documents ?? [])).catch(() => {})
  }, [])

  // Hire flow: when ?fromUser= is present, lock to "Me" mode and pre-fill name + email.
  useEffect(() => {
    if (!fromUserId) return
    setOnboardMode("me")
    fetch(`/api/settings/users`)
      .then(r => r.json())
      .then(d => {
        const u = (d.users ?? []).find((x: any) => x.id === fromUserId)
        if (!u) { setFromUserErr("User not found"); setFromUserLoading(false); return }
        const parts = (u.name ?? "").split(" ")
        setForm(f => ({
          ...f,
          firstName: parts[0] ?? "",
          lastName: parts.slice(1).join(" "),
          email: u.email ?? "",
        }))
        setFromUserLoading(false)
      })
      .catch(() => { setFromUserErr("Failed to load user"); setFromUserLoading(false) })
  }, [fromUserId])

  // Fetch PLs for the chosen primary department (STAFF flow).
  useEffect(() => {
    if (form.role !== "STAFF" || !form.primaryDepartmentId) {
      setPls([])
      return
    }
    setPlsLoading(true)
    fetch(`/api/people/managers/pls-for-department?departmentId=${form.primaryDepartmentId}`)
      .then(r => r.json())
      .then(d => { setPls(d.pls ?? []); setPlsLoading(false) })
      .catch(() => { setPls([]); setPlsLoading(false) })
    // Clear the previously-chosen PL — they may not belong to this new dept
    setForm(f => ({ ...f, primaryProjectLeadId: "" }))
  }, [form.role, form.primaryDepartmentId])

  // Check each secondary dept for PL coverage so we can block submit if any is empty.
  useEffect(() => {
    if (form.role !== "STAFF" || form.secondaryDepartmentIds.length === 0) {
      setSecondaryDeptStatus({})
      return
    }
    const todo = form.secondaryDepartmentIds
    Promise.all(
      todo.map(id => fetch(`/api/people/managers/pls-for-department?departmentId=${id}`).then(r => r.json()).then(d => [id, (d.pls ?? []).length > 0 ? "has-pl" : "no-pl"] as const))
    ).then(results => {
      const next: Record<string, "has-pl" | "no-pl"> = {}
      for (const [id, status] of results) next[id] = status
      setSecondaryDeptStatus(next)
    }).catch(() => {})
  }, [form.role, form.secondaryDepartmentIds])

  // When role flips, reset role-specific fields so we don't carry stale state.
  useEffect(() => {
    setForm(f => ({
      ...f,
      primaryDepartmentId: "",
      primaryProjectLeadId: "",
      secondaryDepartmentIds: [],
      departmentIds: [],
      managerEmployeeId: "",
    }))
    setSecondaryDeptStatus({})
  }, [form.role])

  // Invite-mode equivalents — same logic for the simpler invite form.
  useEffect(() => {
    if (inviteForm.role !== "STAFF" || !inviteForm.primaryDepartmentId) { setInvitePls([]); return }
    fetch(`/api/people/managers/pls-for-department?departmentId=${inviteForm.primaryDepartmentId}`)
      .then(r => r.json())
      .then(d => setInvitePls(d.pls ?? []))
      .catch(() => setInvitePls([]))
    setInviteForm(f => ({ ...f, primaryProjectLeadId: "" }))
  }, [inviteForm.role, inviteForm.primaryDepartmentId])

  useEffect(() => {
    if (inviteForm.role !== "STAFF" || inviteForm.secondaryDepartmentIds.length === 0) { setInviteSecDeptStatus({}); return }
    Promise.all(
      inviteForm.secondaryDepartmentIds.map(id => fetch(`/api/people/managers/pls-for-department?departmentId=${id}`).then(r => r.json()).then(d => [id, (d.pls ?? []).length > 0 ? "has-pl" : "no-pl"] as const))
    ).then(results => {
      const next: Record<string, "has-pl" | "no-pl"> = {}
      for (const [id, status] of results) next[id] = status
      setInviteSecDeptStatus(next)
    }).catch(() => {})
  }, [inviteForm.role, inviteForm.secondaryDepartmentIds])

  useEffect(() => {
    setInviteForm(f => ({ ...f, primaryDepartmentId: "", primaryProjectLeadId: "", secondaryDepartmentIds: [], departmentIds: [], managerEmployeeId: "" }))
    setInviteSecDeptStatus({})
  }, [inviteForm.role])

  const checkEmail = async (email: string) => {
    if (!email || !email.includes("@")) { setEmailAvailable(null); return }
    setEmailChecking(true)
    await new Promise(r => setTimeout(r, 500))
    setEmailChecking(false)
    setEmailAvailable(true)
  }

  const checkInviteEmail = async (email: string) => {
    if (!email || !email.includes("@")) { setInviteEmailAvailable(null); return }
    setInviteEmailChecking(true)
    try {
      const r = await fetch(`/api/settings/users`)
      const d = await r.json()
      const taken = (d.users ?? []).some((u: any) => u.email?.toLowerCase() === email.toLowerCase())
      setInviteEmailAvailable(!taken)
    } catch { setInviteEmailAvailable(null) }
    setInviteEmailChecking(false)
  }

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (k === "email") { setEmailAvailable(null); checkEmail(e.target.value) }
  }
  const setP = (k: keyof typeof personal) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPersonal(p => ({ ...p, [k]: e.target.value }))
  const setIF = (k: keyof typeof inviteForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInviteForm(f => ({ ...f, [k]: e.target.value }))

  const fi: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
    fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  }
  const maxDob = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 13); return d.toISOString().split("T")[0] })()

  const validateStep0 = () => {
    if (!form.firstName.trim()) { setErr("First name is required"); return false }
    if (!form.lastName.trim()) { setErr("Last name is required"); return false }
    if (!form.email.trim()) { setErr("Work email is required"); return false }
    if (!form.hireDate) { setErr("Hire date is required"); return false }
    if (!form.jobTitle) { setErr("Job title is required"); return false }
    if (form.role === "STAFF") {
      if (!form.primaryDepartmentId) { setErr("Primary Department is required"); return false }
      if (pls.length === 0) { setErr("Primary department has no Project Lead. Assign one before adding staff."); return false }
      if (!form.primaryProjectLeadId) { setErr("Primary Project Lead is required"); return false }
      const blockedSec = form.secondaryDepartmentIds.find(id => secondaryDeptStatus[id] === "no-pl")
      if (blockedSec) {
        const dept = departments.find(d => d.id === blockedSec)
        setErr(`${dept?.name ?? "Department"} does not have a Project Lead yet`)
        return false
      }
    } else if (form.role === "PROJECT_LEAD") {
      if (form.departmentIds.length === 0) { setErr("At least one department to lead is required"); return false }
      if (!form.managerEmployeeId) { setErr("Manager is required"); return false }
    }
    return true
  }

  const nextStep = () => {
    setErr("")
    if (step === 0 && !validateStep0()) return
    setStep(s => s + 1)
  }
  const prevStep = () => { setErr(""); setStep(s => s - 1) }

  const finish = async () => {
    setSaving(true); setErr("")
    try {
      const genderMap: Record<string, string> = { Male: "MALE", Female: "FEMALE" }
      const statusMap: Record<string, string> = { "Full-time": "FULL_TIME", "Part-time": "PART_TIME", "Contract": "CONTRACT" }
      const r = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone || personal.phone2,
          gender: genderMap[personal.gender] ?? personal.gender,
          dateOfBirth: personal.birthday || undefined,
          employmentType: statusMap[form.employmentStatus] ?? "FULL_TIME",
          selectedDocuments: selectedDocs,
          existingUserId: fromUserId || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.error ?? "Failed to create employee"); setSaving(false); return }
      router.push("/admin/people/employees")
    } catch {
      setErr("Network error, please try again")
      setSaving(false)
    }
  }

  const firstName = form.firstName || "the employee"

  // ── Choice screen ──────────────────────────────────────────────────────────
  // Hire flow (?fromUser=) locks to "Me" mode — skip the picker entirely.
  if (onboardMode === null && !fromUserId) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
          <button onClick={() => router.push("/admin/people/employees")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/people/employees")}>Employees</span>
          <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
          <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Add new Member</span>
        </div>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Who Should Handle Employee Onboarding?</h1>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>You or Your Employee? Choose your preferred option.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            {([
              { key: "employee" as const, icon: <Users size={32} style={{ color: "#2563eb" }} />, iconBg: "#EFF6FF", title: "Employee", desc: "Invite your employee to fill in their information" },
              { key: "me" as const, icon: <UserCog size={32} style={{ color: "#db2777" }} />, iconBg: "#FDF2F8", title: "Me", desc: "Admin fills out the details of hired employee" },
            ]).map(card => (
              <button key={card.key} onClick={() => setSelectedCard(card.key)}
                style={{ padding: "32px 24px", background: "var(--card)", border: `2px solid ${selectedCard === card.key ? "var(--primary)" : "var(--border)"}`, borderRadius: 16, cursor: "pointer", textAlign: "center", transition: "all .15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"}
                onMouseLeave={e => { if (selectedCard !== card.key) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: card.iconBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  {card.icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{card.title}</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{card.desc}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (selectedCard) setOnboardMode(selectedCard) }}
            disabled={!selectedCard}
            style={{ width: "100%", padding: "14px 0", background: "var(--primary)", border: "none", borderRadius: 10, cursor: selectedCard ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, color: "white", opacity: selectedCard ? 1 : 0.4 }}>
            Proceed
          </button>
        </div>
      </div>
    )
  }

  if (onboardMode === "employee" && !inviteSuccess) {
    const submitInvite = async () => {
      if (!inviteForm.firstName.trim() || !inviteForm.lastName.trim() || !inviteForm.email.trim() || !inviteForm.hireDate || !inviteForm.jobTitle || !inviteForm.gender || !inviteForm.dateOfBirth) {
        setInviteErr("All required fields must be filled"); return
      }
      if (inviteEmailAvailable === false) { setInviteErr("This email is already in use"); return }
      if (inviteForm.role === "STAFF") {
        if (!inviteForm.primaryDepartmentId) { setInviteErr("Primary Department is required"); return }
        if (invitePls.length === 0) { setInviteErr("Primary department has no Project Lead. Assign one before adding staff."); return }
        if (!inviteForm.primaryProjectLeadId) { setInviteErr("Primary Project Lead is required"); return }
        const blockedSec = inviteForm.secondaryDepartmentIds.find(id => inviteSecDeptStatus[id] === "no-pl")
        if (blockedSec) {
          const dept = departments.find(d => d.id === blockedSec)
          setInviteErr(`${dept?.name ?? "Department"} does not have a Project Lead yet`); return
        }
      } else if (inviteForm.role === "PROJECT_LEAD") {
        if (inviteForm.departmentIds.length === 0) { setInviteErr("At least one department to lead is required"); return }
        if (!inviteForm.managerEmployeeId) { setInviteErr("Manager is required"); return }
      }
      setInviteSaving(true); setInviteErr("")
      const genderMap: Record<string, string> = { Male: "MALE", Female: "FEMALE" }
      const r = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inviteForm,
          gender: genderMap[inviteForm.gender] ?? inviteForm.gender,
          inviteMode: true,
        }),
      })
      const d = await r.json()
      setInviteSaving(false)
      if (!r.ok) { setInviteErr(d.error ?? "Failed to send invite"); return }
      setInviteSuccess(true)
    }
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
          <button onClick={() => setOnboardMode(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/people/employees")}>Employees</span>
          <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
          <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Invite Employee</span>
        </div>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 32px" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}>
            <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Invite Employee</h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Enter the basics — the employee will receive a link to complete their own profile.</p>
            </div>
            <div style={{ padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Field label="First Name" required><input value={inviteForm.firstName} onChange={setIF("firstName")} style={fi} placeholder="e.g. Emmanuel" /></Field>
              <Field label="Last Name" required><input value={inviteForm.lastName} onChange={setIF("lastName")} style={fi} placeholder="e.g. Okafor" /></Field>
              <Field label="Work Email" required>
                <div style={{ position: "relative" }}>
                  <input type="email" value={inviteForm.email}
                    onChange={e => { setIF("email")(e); setInviteEmailAvailable(null); checkInviteEmail(e.target.value) }}
                    style={{ ...fi, borderColor: inviteEmailAvailable === false ? "#ef4444" : inviteEmailAvailable === true ? "#16a34a" : "var(--border)", paddingRight: 36 }}
                    placeholder="email@datasciencenigeria.ai" />
                  {inviteEmailChecking && <Loader2 size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", animation: "spin .8s linear infinite", color: "var(--muted-foreground)" }} />}
                  {inviteEmailAvailable === true && !inviteEmailChecking && <Check size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#16a34a" }} />}
                  {inviteEmailAvailable === false && !inviteEmailChecking && <X size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444" }} />}
                </div>
                {inviteEmailAvailable === false && !inviteEmailChecking && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>Email already in use</div>}
                {inviteEmailAvailable === true && !inviteEmailChecking && <div style={{ fontSize: 11, color: "#16a34a", marginTop: 3 }}>Email is available</div>}
              </Field>
              <Field label="Hire Date" required><input type="date" value={inviteForm.hireDate} onChange={setIF("hireDate")} style={fi} /></Field>
              <Field label="Role" required>
                <select value={inviteForm.role} onChange={setIF("role")} style={{ ...fi, appearance: "none", cursor: "pointer" }}>
                  <option value="STAFF">Staff</option>
                  <option value="PROJECT_LEAD">Project Lead</option>
                </select>
              </Field>
              <SearchableSelect label="Job Title" value={inviteForm.jobTitle} required
                onChange={v => setInviteForm(f => ({ ...f, jobTitle: v }))}
                options={jobTitles.map(jt => ({ value: jt.name, label: jt.name }))}
                placeholder="Select job title…" />
              <Field label="Gender" required>
                <select value={inviteForm.gender} onChange={setIF("gender")} style={{ ...fi, appearance: "none", cursor: "pointer" }}>
                  <option value="">Select…</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Date of Birth" required>
                <input type="date" value={inviteForm.dateOfBirth} onChange={setIF("dateOfBirth")} max={maxDob} style={fi} />
              </Field>
            </div>

            {/* Role-aware section */}
            <div style={{ padding: "0 32px 24px", display: "grid", gap: 16 }}>
              {inviteForm.role === "STAFF" ? (
                <>
                  <SearchableSelect label="Primary Department" value={inviteForm.primaryDepartmentId} required
                    onChange={v => setInviteForm(f => ({ ...f, primaryDepartmentId: v }))}
                    options={departments.map(d => ({ value: d.id, label: d.name }))}
                    placeholder="Select primary department…" />
                  {inviteForm.primaryDepartmentId && (
                    <div>
                      <SearchableSelect label="Primary Project Lead" value={inviteForm.primaryProjectLeadId} required
                        onChange={v => setInviteForm(f => ({ ...f, primaryProjectLeadId: v }))}
                        options={invitePls.map((p: any) => ({ value: p.id, label: `${p.firstName} ${p.lastName}${p.jobTitle ? ` — ${p.jobTitle}` : ""}` }))}
                        placeholder={invitePls.length === 0 ? "No Project Lead in this department" : "Select Project Lead…"} />
                      {invitePls.length === 0 && (
                        <div style={{ marginTop: 6, padding: "8px 12px", background: "#FEE2E2", borderRadius: 6, fontSize: 12, color: "#DC2626", display: "flex", alignItems: "center", gap: 6 }}>
                          <AlertCircle size={13} /> This department has no Project Lead yet.
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Secondary Departments <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400, marginLeft: 6 }}>(optional)</span></label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {departments.filter(d => d.id !== inviteForm.primaryDepartmentId).map(d => {
                        const selected = inviteForm.secondaryDepartmentIds.includes(d.id)
                        const noPL = inviteSecDeptStatus[d.id] === "no-pl"
                        return (
                          <button key={d.id} type="button"
                            onClick={() => setInviteForm(f => ({ ...f, secondaryDepartmentIds: selected ? f.secondaryDepartmentIds.filter(x => x !== d.id) : [...f.secondaryDepartmentIds, d.id] }))}
                            style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 999, cursor: "pointer", background: selected ? "var(--primary)" : "var(--muted)", color: selected ? "white" : "var(--foreground)", border: selected && noPL ? "1.5px solid #DC2626" : "1px solid var(--border)" }}>
                            {d.name}{selected && noPL && " ⚠"}
                          </button>
                        )
                      })}
                    </div>
                    {inviteForm.secondaryDepartmentIds.filter(id => inviteSecDeptStatus[id] === "no-pl").map(id => {
                      const dept = departments.find(d => d.id === id)
                      return (
                        <div key={id} style={{ marginTop: 6, padding: "8px 12px", background: "#FEE2E2", borderRadius: 6, fontSize: 12, color: "#DC2626", display: "flex", alignItems: "center", gap: 6 }}>
                          <AlertCircle size={13} /> {dept?.name ?? "Department"} does not have a Project Lead yet
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Departments to Lead <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span></label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {departments.map(d => {
                        const selected = inviteForm.departmentIds.includes(d.id)
                        return (
                          <button key={d.id} type="button"
                            onClick={() => setInviteForm(f => ({ ...f, departmentIds: selected ? f.departmentIds.filter(x => x !== d.id) : [...f.departmentIds, d.id] }))}
                            style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 999, cursor: "pointer", background: selected ? "var(--primary)" : "var(--muted)", color: selected ? "white" : "var(--foreground)", border: "1px solid var(--border)" }}>
                            {d.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <SearchableSelect label="Manager" value={inviteForm.managerEmployeeId} required
                    onChange={v => setInviteForm(f => ({ ...f, managerEmployeeId: v }))}
                    options={managers.map((m: any) => ({ value: m.employee.id, label: `${m.employee.firstName} ${m.employee.lastName}${m.employee.jobTitle ? ` — ${m.employee.jobTitle}` : ""}` }))}
                    placeholder={managers.length === 0 ? "No managers seeded yet" : "Select Manager…"} />
                </>
              )}
            </div>
            {inviteErr && <div style={{ margin: "0 32px 16px", padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{inviteErr}</div>}
            <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setOnboardMode(null)} style={{ padding: "10px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Back</button>
              <button onClick={submitInvite} disabled={inviteSaving || inviteEmailAvailable === false} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: inviteSaving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white", opacity: inviteSaving || inviteEmailAvailable === false ? 0.5 : 1 }}>
                {inviteSaving && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
                {inviteSaving ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (onboardMode === "employee" && inviteSuccess) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "48px 40px", maxWidth: 480, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Check size={28} style={{ color: "#16a34a" }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Invite Sent!</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: 28 }}>
            An invitation email has been sent to <strong>{inviteForm.email}</strong>. They&apos;ll receive a link to complete their profile.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => { setInviteForm({ firstName: "", lastName: "", email: "", hireDate: "", jobTitle: "", gender: "", dateOfBirth: "", role: "STAFF", primaryDepartmentId: "", primaryProjectLeadId: "", secondaryDepartmentIds: [], departmentIds: [], managerEmployeeId: "" }); setInviteSuccess(false) }}
              style={{ padding: "10px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              Invite Another
            </button>
            <button onClick={() => router.push("/admin/people/employees")}
              style={{ padding: "10px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>
              Back to Employees
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <button onClick={() => step === 0 ? setOnboardMode(null) : prevStep()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/people/employees")}>Employees</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
        <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Add new Member</span>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 32px" }}>
        {fromUserId && !fromUserLoading && !fromUserErr && (
          <div style={{ marginBottom: 20, padding: "14px 18px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Info size={16} style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: "#1E40AF", lineHeight: 1.6 }}>
              <strong>Hiring an existing admin:</strong> This person already has an admin account. You are adding them as an employee. Their login credentials and admin access stay unchanged.
            </div>
          </div>
        )}
        {fromUserErr && (
          <div style={{ marginBottom: 20, padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{fromUserErr}</div>
        )}
        <Stepper current={step} />

        {/* ── Step 0: Basic Information ────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>1.1 Basic Details</h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>Enter the employee's personal and employment information.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Field label="First Name" required>
                  <input value={form.firstName} onChange={setF("firstName")} readOnly={!!fromUserId} style={{ ...fi, ...(fromUserId && { background: "var(--muted)", cursor: "not-allowed" }) }} placeholder="e.g. Emmanuel" />
                </Field>
                <Field label="Middle Name">
                  <input value={form.middleName} onChange={setF("middleName")} style={fi} placeholder="Optional" />
                </Field>
                <Field label="Last Name" required>
                  <input value={form.lastName} onChange={setF("lastName")} readOnly={!!fromUserId} style={{ ...fi, ...(fromUserId && { background: "var(--muted)", cursor: "not-allowed" }) }} placeholder="e.g. Okafor" />
                </Field>
                <SearchableSelect label="Work Location" value={form.workplaceId} required
                  onChange={v => setForm(f => ({ ...f, workplaceId: v }))}
                  options={workplaces.map(w => ({ value: w.id, label: w.displayName }))}
                  placeholder="Select workplace…" />
                <Field label="Email" required>
                  <div style={{ position: "relative" }}>
                    <input value={form.email} onChange={setF("email")} readOnly={!!fromUserId} style={{ ...fi, borderColor: emailAvailable === false ? "#ef4444" : emailAvailable === true ? "var(--primary)" : "var(--border)", paddingRight: 36, ...(fromUserId && { background: "var(--muted)", cursor: "not-allowed" }) }} placeholder="Enter Email" />
                    {emailChecking && <Loader2 size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", animation: "spin .8s linear infinite", color: "var(--muted-foreground)" }} />}
                    {emailAvailable === true && !emailChecking && <Check size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#16a34a" }} />}
                  </div>
                  {emailAvailable === true && !emailChecking && !fromUserId && <div style={{ fontSize: 11, color: "#16a34a", marginTop: 3 }}>Email is available</div>}
                </Field>
                <Field label="Hire date" required>
                  <input type="date" value={form.hireDate} onChange={setF("hireDate")} style={fi} />
                </Field>
                <Field label="Phone Number">
                  <input value={form.phone} onChange={setF("phone")} style={fi} placeholder="233 xxxxxxxx" />
                </Field>
                <Field label="Employee Number" hint="(We will provide one if you don't have one)">
                  <input value={form.employeeNumber} onChange={setF("employeeNumber")} style={fi} placeholder="e.g. EMP001" />
                </Field>
              </div>
            </div>

            <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>1.2 Employment Details</h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>Set the employee's role first — Department, Project Lead, and Manager fields below adapt to the chosen role.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Field label="Role" required>
                  <select value={form.role} onChange={setF("role")} style={{ ...fi, appearance: "none", cursor: "pointer" }}>
                    <option value="STAFF">Staff</option>
                    <option value="PROJECT_LEAD">Project Lead</option>
                  </select>
                </Field>
                <SearchableSelect label="Job Title" value={form.jobTitle} required
                  onChange={v => setForm(f => ({ ...f, jobTitle: v }))}
                  options={jobTitles.map(jt => ({ value: jt.name, label: jt.name }))}
                  placeholder="Select job title…" />
                <Field label="Status" required>
                  <select value={form.employmentStatus} onChange={setF("employmentStatus")} style={{ ...fi, appearance: "none", cursor: "pointer" }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {/* ── Role-aware department / PL / manager section ─────────────────── */}
            <div style={{ padding: "28px 32px" }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>
                1.3 {form.role === "STAFF" ? "Department & Project Lead" : "Departments to Lead & Manager"}
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
                {form.role === "STAFF"
                  ? "Pick the primary department first. The Project Lead dropdown loads PLs of that department. Secondary departments are optional — each must have a Project Lead."
                  : "Pick the departments this Project Lead will lead, then choose the Manager they report to."}
              </p>

              {form.role === "STAFF" ? (
                <div style={{ display: "grid", gap: 20 }}>
                  <SearchableSelect label="Primary Department" value={form.primaryDepartmentId} required
                    onChange={v => setForm(f => ({ ...f, primaryDepartmentId: v }))}
                    options={departments.map(d => ({ value: d.id, label: d.name }))}
                    placeholder="Select primary department…" />

                  {form.primaryDepartmentId && (
                    <div>
                      <SearchableSelect label="Primary Project Lead" value={form.primaryProjectLeadId} required
                        onChange={v => setForm(f => ({ ...f, primaryProjectLeadId: v }))}
                        options={pls.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName}${p.jobTitle ? ` — ${p.jobTitle}` : ""}` }))}
                        placeholder={plsLoading ? "Loading PLs…" : pls.length === 0 ? "No Project Lead in this department" : "Select Project Lead…"} />
                      {!plsLoading && pls.length === 0 && (
                        <div style={{ marginTop: 6, padding: "8px 12px", background: "#FEE2E2", borderRadius: 6, fontSize: 12, color: "#DC2626", display: "flex", alignItems: "center", gap: 6 }}>
                          <AlertCircle size={13} /> This department has no Project Lead yet. Assign one before adding staff.
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Secondary Departments <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400, marginLeft: 6 }}>(optional)</span></label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {departments.filter(d => d.id !== form.primaryDepartmentId).map(d => {
                        const selected = form.secondaryDepartmentIds.includes(d.id)
                        const noPL = secondaryDeptStatus[d.id] === "no-pl"
                        return (
                          <button key={d.id} type="button"
                            onClick={() => setForm(f => ({
                              ...f,
                              secondaryDepartmentIds: selected ? f.secondaryDepartmentIds.filter(x => x !== d.id) : [...f.secondaryDepartmentIds, d.id],
                            }))}
                            style={{
                              padding: "6px 12px", fontSize: 12, fontWeight: 600,
                              borderRadius: 999, cursor: "pointer",
                              background: selected ? "var(--primary)" : "var(--muted)",
                              color: selected ? "white" : "var(--foreground)",
                              border: selected && noPL ? "1.5px solid #DC2626" : "1px solid var(--border)",
                            }}>
                            {d.name}{selected && noPL && " ⚠"}
                          </button>
                        )
                      })}
                    </div>
                    {form.secondaryDepartmentIds.filter(id => secondaryDeptStatus[id] === "no-pl").map(id => {
                      const dept = departments.find(d => d.id === id)
                      return (
                        <div key={id} style={{ marginTop: 6, padding: "8px 12px", background: "#FEE2E2", borderRadius: 6, fontSize: 12, color: "#DC2626", display: "flex", alignItems: "center", gap: 6 }}>
                          <AlertCircle size={13} /> {dept?.name ?? "Department"} does not have a Project Lead yet
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Departments to Lead <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span></label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {departments.map(d => {
                        const selected = form.departmentIds.includes(d.id)
                        return (
                          <button key={d.id} type="button"
                            onClick={() => setForm(f => ({
                              ...f,
                              departmentIds: selected ? f.departmentIds.filter(x => x !== d.id) : [...f.departmentIds, d.id],
                            }))}
                            style={{
                              padding: "6px 12px", fontSize: 12, fontWeight: 600,
                              borderRadius: 999, cursor: "pointer",
                              background: selected ? "var(--primary)" : "var(--muted)",
                              color: selected ? "white" : "var(--foreground)",
                              border: "1px solid var(--border)",
                            }}>
                            {d.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <SearchableSelect label="Manager" value={form.managerEmployeeId} required
                    onChange={v => setForm(f => ({ ...f, managerEmployeeId: v }))}
                    options={managers.map((m: any) => ({ value: m.employee.id, label: `${m.employee.firstName} ${m.employee.lastName}${m.employee.jobTitle ? ` — ${m.employee.jobTitle}` : ""}` }))}
                    placeholder={managers.length === 0 ? "No managers seeded yet" : "Select Manager…"} />
                </div>
              )}
            </div>

            {err && <div style={{ margin: "0 32px 16px", padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
            <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={nextStep} style={{ padding: "10px 32px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>Next</button>
            </div>
          </div>
        )}

        {/* ── Step 1: Personal Details ─────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {/* 2.1 Profile */}
            <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>2.1 Personal Info</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
                <Field label="Phone Number" required>
                  <input value={personal.phone2} onChange={setP("phone2")} style={fi} placeholder="233 xxxxxxxx" />
                </Field>
                <Field label="Birthday" required>
                  <input type="date" value={personal.birthday} onChange={setP("birthday")} max={maxDob} style={fi} />
                </Field>
                <Field label="Gender" required>
                  <select value={personal.gender} onChange={setP("gender")} style={{ ...fi, appearance: "none" }}>
                    <option value="">Select…</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Marital Status">
                  <select value={personal.maritalStatus} onChange={setP("maritalStatus")} style={{ ...fi, appearance: "none" }}>
                    <option value="">Select…</option>
                    {MARITAL.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Recovery Email">
                  <input type="email" value={personal.recoveryEmail} onChange={setP("recoveryEmail")} style={fi} placeholder="Personal email" />
                </Field>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={personal.showPhone} onChange={e => setPersonal(p => ({ ...p, showPhone: e.target.checked }))} style={{ accentColor: "var(--primary)" }} />
                    Display phone number to co-workers
                  </label>
                </div>
              </div>
            </div>

            {/* 2.2 Home Address */}
            <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>2.2 Home Address</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Field label="Address line 1" required>
                  <input value={personal.address1} onChange={setP("address1")} style={fi} placeholder="Street address" />
                </Field>
                <Field label="Country" required>
                  <input value={personal.country} onChange={setP("country")} style={fi} placeholder="e.g. Nigeria" />
                </Field>
                <Field label="Address line 2">
                  <input value={personal.address2} onChange={setP("address2")} style={fi} placeholder="Apartment, suite, etc." />
                </Field>
                <Field label="Zip Code">
                  <input value={personal.zip} onChange={setP("zip")} style={fi} placeholder="e.g. 100001" />
                </Field>
                <Field label="City">
                  <input value={personal.city} onChange={setP("city")} style={fi} placeholder="e.g. Lagos" />
                </Field>
                <Field label="State / Province" required>
                  <input value={personal.state} onChange={setP("state")} style={fi} placeholder="e.g. Lagos" />
                </Field>
              </div>
            </div>

            {/* 2.3 Next of Kin */}
            <div style={{ padding: "28px 32px" }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>2.3 Next of Kin</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Field label="Name" required>
                  <input value={personal.nokName} onChange={setP("nokName")} style={fi} placeholder="Full name" />
                </Field>
                <Field label="Relationship">
                  <input value={personal.nokRelationship} onChange={setP("nokRelationship")} style={fi} placeholder="e.g. Spouse" />
                </Field>
                <Field label="Email">
                  <input type="email" value={personal.nokEmail} onChange={setP("nokEmail")} style={fi} placeholder="Email address" />
                </Field>
                <Field label="Mobile Number" required>
                  <input value={personal.nokPhone} onChange={setP("nokPhone")} style={fi} placeholder="Phone number" />
                </Field>
              </div>
            </div>

            <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <button onClick={prevStep} style={{ padding: "10px 28px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Previous</button>
              <button onClick={nextStep} style={{ padding: "10px 32px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>Next</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Documents ───────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>3. Onboarding Documents</h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                {firstName} will be able to review and sign these documents after onboarding is complete. The document will then be securely stored for you to access anytime.
              </p>
            </div>
            <div style={{ padding: "28px 32px" }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>What custom documents would you like to include for {firstName}?</p>
              {orgDocs.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>No onboarding documents configured yet.</div>
              ) : (
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 20px", background: "var(--muted)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                    <input type="checkbox" checked={selectedDocs.length === orgDocs.length && orgDocs.length > 0}
                      onChange={e => setSelectedDocs(e.target.checked ? orgDocs.map(d => d.id) : [])}
                      style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)" }}>Document Type</span>
                  </div>
                  {orgDocs.map(doc => (
                    <label key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: selectedDocs.includes(doc.id) ? "rgba(37,99,235,0.04)" : "" }}>
                      <input type="checkbox" checked={selectedDocs.includes(doc.id)}
                        onChange={e => setSelectedDocs(ids => e.target.checked ? [...ids, doc.id] : ids.filter(i => i !== doc.id))}
                        style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
                      <span style={{ fontSize: 14 }}>{doc.title ?? doc.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <button onClick={prevStep} style={{ padding: "10px 28px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Previous</button>
              <button onClick={nextStep} style={{ padding: "10px 32px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>Next</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Welcome Options ─────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", maxWidth: 600, margin: "0 auto" }}>
            <div style={{ padding: "48px 40px" }}>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, lineHeight: 1.6 }}>
                {firstName} has already joined Data Science Nigeria, so we'll skip the welcome options this time.
              </p>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: 28 }}>
                {firstName} will have access to Data Science Nigeria once you approve their information under Needs Attention in your People Menu.
              </p>
              {err && <div style={{ padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626", marginBottom: 20 }}>{err}</div>}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={prevStep} style={{ padding: "10px 28px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Previous</button>
                <button onClick={finish} disabled={saving} style={{ padding: "10px 32px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                  {saving ? <><Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Finish"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
