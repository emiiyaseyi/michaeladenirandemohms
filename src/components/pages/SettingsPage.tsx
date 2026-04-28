"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import { Building2, CalendarDays, Plus, Users, ShieldCheck, KeyRound, UserX, UserCheck, Pencil, Trash2, Palette, Upload, GitBranch, Check, Loader2, ChevronUp, ChevronDown, ArrowRight, X } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { roleLabel, ALL_ROLES, type SystemRole } from "@/lib/rbac"

// ─── Approval workflow: available approver roles ──────────────────────────────
const APPROVER_ROLES = [
  { key: "STAFF",      label: "Relief Officer" },
  { key: "TEAM_LEAD",        label: "Project Lead" },
  { key: "TEAM_LEAD",           label: "Team Lead" },
  { key: "TEAM_LEAD",     label: "Department Lead" },
  { key: "TEAM_LEAD",             label: "Manager" },
  { key: "TEAM_LEAD",     label: "Project Manager" },
  { key: "ADMIN", label: "Performance Officer" },
  { key: "ADMIN",            label: "HR Admin" },
  { key: "ADMIN",               label: "Admin" },
  { key: "ADMIN",         label: "Super Admin" },
]

const DEFAULT_WF_CATEGORIES = [
  {
    id: "leave", name: "Leave", description: "Leave request approval chain", isSystem: true,
    chain: [
      { role: "STAFF", label: "Relief Officer", deadlineHours: 24 },
      { role: "TEAM_LEAD",   label: "Project Lead",   deadlineHours: 24 },
      { role: "TEAM_LEAD",      label: "Team Lead",      deadlineHours: 48 },
      { role: "TEAM_LEAD",        label: "Manager",        deadlineHours: 48 },
      { role: "ADMIN",       label: "HR Admin",       deadlineHours: 72 },
    ],
  },
  {
    id: "performance", name: "Performance Reviews", description: "Appraisal sign-off chain", isSystem: true,
    chain: [
      { role: "TEAM_LEAD",  label: "Manager",  deadlineHours: 72 },
      { role: "ADMIN", label: "HR Admin", deadlineHours: 72 },
    ],
  },
  {
    id: "profile_changes", name: "Employee Profile Changes", description: "Profile update requests", isSystem: true,
    chain: [
      { role: "ADMIN", label: "HR Admin", deadlineHours: 48 },
    ],
  },
]

// ─── Custom roles: granular sub-duty groups ───────────────────────────────────
const DUTY_GROUPS = [
  { group: "Payroll & Payslips", duties: [
    { key: "canViewPayslips",     label: "View employee payslips" },
    { key: "canCreatePayslip",    label: "Create / generate payslips" },
    { key: "canEditPayslip",      label: "Edit payslip entries" },
    { key: "canReleasePayslip",   label: "Release payslips to employees" },
    { key: "canDeletePayslip",    label: "Delete / void payslips" },
    { key: "canExportPayroll",    label: "Export payroll data" },
  ]},
  { group: "Leave Management", duties: [
    { key: "canViewAllLeave",      label: "View all leave requests" },
    { key: "canApproveLeave",      label: "Approve or reject leave" },
    { key: "canCancelLeave",       label: "Cancel leave on behalf of employee" },
    { key: "canManageLeaveTypes",  label: "Create / edit leave types" },
    { key: "canAdjustLeaveBalance",label: "Manually adjust leave balances" },
    { key: "canNudgeApprovers",    label: "Send nudge notifications to approvers" },
    { key: "canViewLeaveReports",  label: "View leave analytics & reports" },
  ]},
  { group: "HR & Employees", duties: [
    { key: "canViewAllEmployees",    label: "View all employee records" },
    { key: "canCreateEmployee",      label: "Add new employees" },
    { key: "canEditEmployee",        label: "Edit employee records" },
    { key: "canDeactivateEmployee",  label: "Deactivate / offboard employees" },
    { key: "canManageDepartments",   label: "Create / edit departments" },
    { key: "canViewReports",         label: "View HR reports" },
    { key: "canExportReports",       label: "Export reports to CSV / PDF" },
    { key: "canManageAnnouncements", label: "Create & manage announcements" },
    { key: "canManageDocuments",     label: "Upload & manage org documents" },
  ]},
  { group: "Benefits Administration", duties: [
    { key: "canViewBenefits",         label: "View benefits enrollments" },
    { key: "canManageBenefits",       label: "Create / edit benefit plans" },
    { key: "canEnrollBenefits",       label: "Enroll employees in benefits" },
    { key: "canProcessBenefitClaims", label: "Process benefit claims" },
    { key: "canManagePension",        label: "Manage pension records" },
    { key: "canManageHMO",            label: "Manage HMO / health insurance" },
  ]},
  { group: "Performance Management", duties: [
    { key: "canViewPerformance",       label: "View performance records" },
    { key: "canCreateReview",          label: "Create performance review cycles" },
    { key: "canManageKPIs",            label: "Create & manage KPIs / goals" },
    { key: "canSubmitAppraisals",      label: "Submit appraisals" },
    { key: "canApproveAppraisals",     label: "Approve & finalise appraisals" },
    { key: "canViewPerformanceReports",label: "View performance analytics" },
  ]},
  { group: "Projects", duties: [
    { key: "canViewProjects",              label: "View all projects" },
    { key: "canCreateProject",             label: "Create projects" },
    { key: "canManageProjectAssignments",  label: "Assign / remove team members" },
    { key: "canCloseProject",              label: "Close or archive projects" },
  ]},
  { group: "System & Administration", duties: [
    { key: "canManageSettings", label: "Manage system settings" },
    { key: "canManageUsers",    label: "Create & manage user accounts" },
    { key: "canViewAuditLog",   label: "View audit / activity log" },
    { key: "canSwitchView",     label: "Switch between admin & staff views" },
  ]},
]

// ─── Input style helper ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserRecord {
  id: string
  name: string | null
  email: string | null
  role: SystemRole
  additionalRoles: SystemRole[]
  isActive: boolean
  createdAt: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeId: string
    jobTitle: string | null
    employeeStatus: string
    department: { id: string; name: string } | null
  } | null
}

const BLANK_USER_FORM = {
  firstName: "", lastName: "", email: "", password: "", role: "STAFF" as SystemRole,
  jobTitle: "", departmentId: "", employmentType: "FULL_TIME", employeeId: "",
}

export default function SettingsPage() {
  const { user: currentUser } = useCurrentUser()
  const isSuperAdmin = currentUser?.role === "ADMIN"

  type Tab = "departments" | "leave-types" | "holidays" | "users" | "branding" | "workflow" | "custom-roles"
  const [tab, setTab] = useState<Tab>("departments")

  // ─── Workflow settings ─────────────────────────────────────────────────────
  const [workflow, setWorkflow] = useState<any>(null)
  const [workflowLoading, setWorkflowLoading] = useState(false)
  const [workflowSaving, setWorkflowSaving] = useState(false)
  const [workflowSaved, setWorkflowSaved] = useState(false)
  const [wfCats, setWfCats] = useState<any[]>([])
  const [wfNewCatOpen, setWfNewCatOpen] = useState(false)
  const [wfNewCatForm, setWfNewCatForm] = useState({ name: "", description: "" })
  const [wfAddStep, setWfAddStep] = useState<{ catIdx: number; type: "role" | "employee"; role: string; employeeId: string; deadlineHours: number } | null>(null)
  const [wfEmpList, setWfEmpList] = useState<any[]>([])

  // ─── Custom roles state ────────────────────────────────────────────────────
  const [customRoles, setCustomRoles] = useState<any[]>([])
  const [customRolesLoading, setCustomRolesLoading] = useState(false)
  const [newRoleForm, setNewRoleForm] = useState({ name: "", description: "", duties: [] as string[] })
  const [newRoleOpen, setNewRoleOpen] = useState(false)
  const [newRoleSaving, setNewRoleSaving] = useState(false)

  // ─── Settings data ─────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<any[]>([])
  const [divisions, setDivisions] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [settingsError, setSettingsError] = useState("")

  const BLANK_DEPT = { name: "", description: "", divisionId: "" }
  const BLANK_LEAVE = { name: "", description: "", defaultDays: "21", waitingDays: "0", genderSpecific: "", requiresDoc: false, minDocDays: "2", isActive: true }
  const BLANK_HOLIDAY = { name: "", date: "" }

  const [deptForm, setDeptForm] = useState({ ...BLANK_DEPT })
  const [leaveForm, setLeaveForm] = useState({ ...BLANK_LEAVE })
  const [holidayForm, setHolidayForm] = useState({ ...BLANK_HOLIDAY })

  const [editingDept, setEditingDept] = useState<any | null>(null)
  const [editingLeave, setEditingLeave] = useState<any | null>(null)
  const [editingHoliday, setEditingHoliday] = useState<any | null>(null)

  const [deptOpen, setDeptOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [holidayOpen, setHolidayOpen] = useState(false)

  // ─── User management data ──────────────────────────────────────────────────
  const [sysUsers, setSysUsers] = useState<UserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRecord | null>(null)
  const [resetPwUser, setResetPwUser] = useState<UserRecord | null>(null)
  const [userForm, setUserForm] = useState({ ...BLANK_USER_FORM })
  const [editRole, setEditRole] = useState<SystemRole>("STAFF")
  const [editAdditionalRoles, setEditAdditionalRoles] = useState<SystemRole[]>([])
  const [newPassword, setNewPassword] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [userError, setUserError] = useState("")

  // ─── Branding state ────────────────────────────────────────────────────────
  const [brandingForm, setBrandingForm] = useState({
    orgName: "DataSphere Nigeria",
    font: "Inter",
    primaryColor: "#0052A5",
    logoUrl: null as string | null,
    wallpaperUrl: null as string | null,
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [wallpaperPreview, setWallpaperPreview] = useState<string | null>(null)
  const [brandingSaved, setBrandingSaved] = useState(false)
  const [brandingSaving, setBrandingSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [wallpaperFile, setWallpaperFile] = useState<File | null>(null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)) }
  }
  const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setWallpaperFile(file); setWallpaperPreview(URL.createObjectURL(file)) }
  }

  const uploadBrandingFile = async (file: File, folder: string): Promise<string | null> => {
    const fd = new FormData(); fd.append("file", file); fd.append("folder", folder)
    const r = await fetch("/api/upload", { method: "POST", body: fd })
    const d = await r.json(); return d.url ?? null
  }

  const saveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    setBrandingSaving(true)
    let logoUrl = brandingForm.logoUrl
    let wallpaperUrl = brandingForm.wallpaperUrl
    if (logoFile) logoUrl = await uploadBrandingFile(logoFile, "branding")
    if (wallpaperFile) wallpaperUrl = await uploadBrandingFile(wallpaperFile, "branding")
    const updated = { ...brandingForm, logoUrl, wallpaperUrl }
    await fetch("/api/settings/branding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
    setBrandingForm(updated); setLogoFile(null); setWallpaperFile(null)
    setBrandingSaving(false); setBrandingSaved(true)
    setTimeout(() => setBrandingSaved(false), 2500)
  }

  // ─── Load settings ─────────────────────────────────────────────────────────
  const loadSettings = async () => {
    const [settingsRes, brandingRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/settings/branding"),
    ])
    const d = await settingsRes.json()
    setDepartments(d.departments ?? [])
    setDivisions(d.divisions ?? [])
    setLeaveTypes(d.leaveTypes ?? [])
    setHolidays(d.holidays ?? [])
    if (brandingRes.ok) {
      try {
        const bd = await brandingRes.json()
        if (bd.branding) {
          setBrandingForm(f => ({ ...f, ...bd.branding }))
          if (bd.branding.logoUrl) setLogoPreview(bd.branding.logoUrl)
          if (bd.branding.wallpaperUrl) setWallpaperPreview(bd.branding.wallpaperUrl)
        }
      } catch {}
    }
  }

  const loadUsers = async () => {
    if (!isSuperAdmin) return
    setUsersLoading(true)
    const r = await fetch("/api/settings/users")
    const d = await r.json()
    setSysUsers(d.users ?? [])
    setUsersLoading(false)
  }

  useEffect(() => { loadSettings() }, [])
  useEffect(() => { if (tab === "users") loadUsers() }, [tab, isSuperAdmin])
  useEffect(() => {
    if (tab === "workflow" && !workflow) {
      setWorkflowLoading(true)
      fetch("/api/settings/workflow").then(r => r.json()).then(d => {
        setWorkflow(d.workflow)
        const cats = d.workflow?.categories ?? DEFAULT_WF_CATEGORIES
        setWfCats(cats)
        setWorkflowLoading(false)
      }).catch(() => setWorkflowLoading(false))
    }
    if (tab === "workflow" && wfEmpList.length === 0) {
      fetch("/api/employees").then(r => r.ok ? r.json() : null).then(d => d && setWfEmpList(d.employees ?? [])).catch(() => {})
    }
  }, [tab, workflow])

  useEffect(() => {
    if (tab === "custom-roles") {
      setCustomRolesLoading(true)
      fetch("/api/settings/custom-roles").then(r => r.json()).then(d => { setCustomRoles(d.customRoles ?? []); setCustomRolesLoading(false) }).catch(() => setCustomRolesLoading(false))
    }
  }, [tab])

  // ─── Settings actions ──────────────────────────────────────────────────────
  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault(); setSettingsError("")
    const method = editingDept ? "PATCH" : "POST"
    const body = editingDept ? { id: editingDept.id, ...deptForm } : deptForm
    const r = await fetch("/api/settings/departments", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed"); return }
    setDeptOpen(false); setEditingDept(null); setDeptForm({ ...BLANK_DEPT }); loadSettings()
  }
  const deleteDept = async (id: string) => {
    setSettingsError("")
    const r = await fetch(`/api/settings/departments?id=${id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed to delete"); return }
    loadSettings()
  }

  const saveLeave = async (e: React.FormEvent) => {
    e.preventDefault(); setSettingsError("")
    const method = editingLeave ? "PATCH" : "POST"
    const body = editingLeave ? { id: editingLeave.id, ...leaveForm } : leaveForm
    const r = await fetch("/api/settings/leave-types", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed"); return }
    setLeaveOpen(false); setEditingLeave(null); setLeaveForm({ ...BLANK_LEAVE }); loadSettings()
  }
  const deleteLeave = async (id: string) => {
    setSettingsError("")
    const r = await fetch(`/api/settings/leave-types?id=${id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed to delete"); return }
    loadSettings()
  }

  const saveHoliday = async (e: React.FormEvent) => {
    e.preventDefault(); setSettingsError("")
    const method = editingHoliday ? "PATCH" : "POST"
    const body = editingHoliday ? { id: editingHoliday.id, ...holidayForm } : holidayForm
    const r = await fetch("/api/settings/holidays", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed"); return }
    setHolidayOpen(false); setEditingHoliday(null); setHolidayForm({ ...BLANK_HOLIDAY }); loadSettings()
  }
  const deleteHoliday = async (id: string) => {
    setSettingsError("")
    const r = await fetch(`/api/settings/holidays?id=${id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed to delete"); return }
    loadSettings()
  }

  // ─── User management actions ───────────────────────────────────────────────
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setUserError("")
    const r = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setUserError(d.error ?? "Failed to create user"); return }
    setAddUserOpen(false)
    setUserForm({ ...BLANK_USER_FORM })
    loadUsers()
  }

  const updateRole = async () => {
    if (!editUser) return
    setSaving(true)
    // additionalRoles must not include the primary role
    const additional = editAdditionalRoles.filter(r => r !== editRole)
    await fetch(`/api/settings/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole, additionalRoles: additional }),
    })
    setSaving(false); setEditUser(null); loadUsers()
  }

  const toggleActive = async (u: UserRecord) => {
    await fetch(`/api/settings/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    loadUsers()
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPwUser || !newPassword) return
    setSaving(true)
    await fetch(`/api/settings/users/${resetPwUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    })
    setSaving(false); setResetPwUser(null); setNewPassword("")
  }

  const filteredUsers = sysUsers.filter(u => {
    const q = userSearch.toLowerCase()
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
      u.employee?.employeeId.toLowerCase().includes(q) || u.employee?.department?.name.toLowerCase().includes(q)
  })

  // ─── Tabs config ───────────────────────────────────────────────────────────
  const TABS = [
    { key: "departments" as Tab, label: "Departments", icon: Building2 },
    { key: "leave-types" as Tab, label: "Leave Types", icon: CalendarDays },
    { key: "holidays" as Tab, label: "Public Holidays", icon: CalendarDays },
    { key: "workflow" as Tab, label: "Approval Workflow", icon: GitBranch },
    { key: "custom-roles" as Tab, label: "Custom Roles", icon: ShieldCheck },
    ...(isSuperAdmin ? [{ key: "users" as Tab, label: "User Management", icon: KeyRound }] : []),
    { key: "branding" as Tab, label: "Branding & Customization", icon: Palette },
  ]

  const saveCustomRole = async () => {
    if (!newRoleForm.name || newRoleForm.duties.length === 0) return
    setNewRoleSaving(true)
    const r = await fetch("/api/settings/custom-roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newRoleForm) })
    const d = await r.json()
    if (d.customRole) setCustomRoles(prev => [...prev, d.customRole])
    setNewRoleSaving(false); setNewRoleOpen(false); setNewRoleForm({ name: "", description: "", duties: [] })
  }

  const deleteCustomRole = async (id: string) => {
    if (!confirm("Delete this custom role?")) return
    await fetch(`/api/settings/custom-roles?id=${id}`, { method: "DELETE" })
    setCustomRoles(prev => prev.filter(r => r.id !== id))
  }

  const saveWorkflow = async () => {
    setWorkflowSaving(true)
    const body = { categories: wfCats }
    await fetch("/api/settings/workflow", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setWorkflowSaving(false); setWorkflowSaved(true)
    setTimeout(() => setWorkflowSaved(false), 2500)
  }

  const wfAddStepToChain = (catIdx: number) => {
    if (!wfAddStep) return
    if (wfAddStep.type === "role") {
      const roleInfo = APPROVER_ROLES.find(r => r.key === wfAddStep.role)
      if (!roleInfo) return
      setWfCats(cats => cats.map((c, i) => i !== catIdx ? c : {
        ...c,
        chain: [...c.chain, { type: "role", role: wfAddStep.role, label: roleInfo.label, deadlineHours: wfAddStep.deadlineHours }],
      }))
    } else {
      const emp = wfEmpList.find(e => e.id === wfAddStep.employeeId)
      if (!emp) return
      setWfCats(cats => cats.map((c, i) => i !== catIdx ? c : {
        ...c,
        chain: [...c.chain, { type: "employee", employeeId: wfAddStep.employeeId, label: `${emp.firstName} ${emp.lastName}`, jobTitle: emp.jobTitle, deadlineHours: wfAddStep.deadlineHours }],
      }))
    }
    setWfAddStep(null)
  }

  const wfRemoveStep = (catIdx: number, stepIdx: number) => {
    setWfCats(cats => cats.map((c, i) => i !== catIdx ? c : {
      ...c, chain: c.chain.filter((_: any, j: number) => j !== stepIdx),
    }))
  }

  const wfMoveStep = (catIdx: number, stepIdx: number, dir: -1 | 1) => {
    setWfCats(cats => cats.map((c, i) => {
      if (i !== catIdx) return c
      const chain = [...c.chain]
      const target = stepIdx + dir
      if (target < 0 || target >= chain.length) return c
      ;[chain[stepIdx], chain[target]] = [chain[target], chain[stepIdx]]
      return { ...c, chain }
    }))
  }

  const wfSetDeadline = (catIdx: number, stepIdx: number, hours: number) => {
    setWfCats(cats => cats.map((c, i) => i !== catIdx ? c : {
      ...c,
      chain: c.chain.map((s: any, j: number) => j !== stepIdx ? s : { ...s, deadlineHours: hours }),
    }))
  }

  const wfDeleteCat = (catId: string) => {
    if (!confirm("Delete this workflow category?")) return
    setWfCats(cats => cats.filter(c => c.id !== catId))
  }

  const wfAddCategory = () => {
    if (!wfNewCatForm.name.trim()) return
    const newCat = {
      id: `custom_${Date.now()}`,
      name: wfNewCatForm.name.trim(),
      description: wfNewCatForm.description.trim(),
      isSystem: false,
      chain: [],
    }
    setWfCats(cats => [...cats, newCat])
    setWfNewCatOpen(false)
    setWfNewCatForm({ name: "", description: "" })
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Settings</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Configure your HRMS</p>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* Sidebar nav */}
        <div style={{ flex: "1 1 180px", minWidth: 160, maxWidth: 220 }}>
          <Card style={{ padding: 8 }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === key ? "var(--primary-50, #EBF3FF)" : "transparent", color: tab === key ? "var(--primary)" : "var(--muted-foreground)", fontWeight: tab === key ? 700 : 400, fontSize: 13, textAlign: "left" }}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </Card>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>

          {/* ── Departments ── */}
          {tab === "departments" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Departments ({departments.length})</h3>
                <Button size="sm" onClick={() => { setEditingDept(null); setDeptForm({ ...BLANK_DEPT }); setSettingsError(""); setDeptOpen(true) }}><Plus size={14} /> Add</Button>
              </div>
              {settingsError && tab === "departments" && <div style={{ margin: "12px 20px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
              <div>
                {departments.map(d => (
                  <div key={d.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{d.division?.name ?? "No Division"} · {d._count?.employees ?? 0} employees</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditingDept(d); setDeptForm({ name: d.name, description: d.description ?? "", divisionId: d.divisionId ?? "" }); setSettingsError(""); setDeptOpen(true) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}><Pencil size={12} /> Edit</button>
                      <button onClick={() => { setSettingsError(""); deleteDept(d.id) }} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                ))}
                {departments.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No departments yet.</div>}
              </div>
            </Card>
          )}

          {/* ── Leave Types ── */}
          {tab === "leave-types" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Leave Types ({leaveTypes.length})</h3>
                <Button size="sm" onClick={() => { setEditingLeave(null); setLeaveForm({ ...BLANK_LEAVE }); setSettingsError(""); setLeaveOpen(true) }}><Plus size={14} /> Add</Button>
              </div>
              {settingsError && tab === "leave-types" && <div style={{ margin: "12px 20px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
              <div>
                {leaveTypes.map(l => (
                  <div key={l.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{l.defaultDays} days · {l.genderSpecific ? `${l.genderSpecific} only` : "All genders"} · {l.waitingDays > 0 ? `${l.waitingDays} day notice` : "No notice"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, background: l.isActive ? "var(--success-bg)" : "var(--muted)", color: l.isActive ? "var(--success)" : "var(--muted-foreground)", borderRadius: 999, padding: "2px 10px", fontWeight: 600 }}>{l.isActive ? "Active" : "Inactive"}</span>
                      <button onClick={() => { setEditingLeave(l); setLeaveForm({ name: l.name, description: l.description ?? "", defaultDays: String(l.defaultDays), waitingDays: String(l.waitingDays), genderSpecific: l.genderSpecific ?? "", requiresDoc: l.requiresDoc, minDocDays: String(l.minDocDays), isActive: l.isActive }); setSettingsError(""); setLeaveOpen(true) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}><Pencil size={12} /> Edit</button>
                      <button onClick={() => { setSettingsError(""); deleteLeave(l.id) }} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                ))}
                {leaveTypes.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No leave types configured.</div>}
              </div>
            </Card>
          )}

          {/* ── Holidays ── */}
          {tab === "holidays" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Public Holidays {new Date().getFullYear()}</h3>
                <Button size="sm" onClick={() => { setEditingHoliday(null); setHolidayForm({ ...BLANK_HOLIDAY }); setSettingsError(""); setHolidayOpen(true) }}><Plus size={14} /> Add</Button>
              </div>
              {settingsError && tab === "holidays" && <div style={{ margin: "12px 20px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
              <div>
                {holidays.map(h => (
                  <div key={h.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{new Date(h.date).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</span>
                      <button onClick={() => { setEditingHoliday(h); setHolidayForm({ name: h.name, date: new Date(h.date).toISOString().slice(0, 10) }); setSettingsError(""); setHolidayOpen(true) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}><Pencil size={12} /> Edit</button>
                      <button onClick={() => { setSettingsError(""); deleteHoliday(h.id) }} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                ))}
                {holidays.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No holidays configured for this year.</div>}
              </div>
            </Card>
          )}

          {/* ── User Management (Super Admin only) ── */}
          {tab === "users" && isSuperAdmin && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 12 }}>
                {[
                  { label: "Total Users", value: sysUsers.length, color: "var(--primary)" },
                  { label: "Active", value: sysUsers.filter(u => u.isActive).length, color: "var(--success)" },
                  { label: "Inactive", value: sysUsers.filter(u => !u.isActive).length, color: "var(--danger)" },
                ].map(s => (
                  <Card key={s.label} style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{s.label}</div>
                  </Card>
                ))}
              </div>

              <Card>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>System Users</h3>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      placeholder="Search by name, email, ID, dept..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      style={{ ...inp, width: 240 }}
                    />
                    <Button size="sm" onClick={() => { setUserForm({ ...BLANK_USER_FORM }); setUserError(""); setAddUserOpen(true) }}>
                      <Plus size={14} /> Add User
                    </Button>
                  </div>
                </div>

                {usersLoading ? (
                  <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["User", "Employee ID", "Department", "Role", "Status", "Actions"].map(h => (
                            <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "14px 20px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Avatar name={u.name ?? u.email ?? "?"} size={34} />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name ?? "—"}</div>
                                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "14px 20px", fontSize: 13 }}>
                              <div>{u.employee?.employeeId ?? "—"}</div>
                              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{u.employee?.jobTitle ?? ""}</div>
                            </td>
                            <td style={{ padding: "14px 20px", fontSize: 13 }}>{u.employee?.department?.name ?? "—"}</td>
                            <td style={{ padding: "14px 20px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                <span style={{ fontSize: 12, background: "var(--primary-50, #EBF3FF)", color: "var(--primary)", borderRadius: 999, padding: "3px 10px", fontWeight: 700 }}>
                                  {roleLabel(u.role)}
                                </span>
                                {(u.additionalRoles ?? []).map((r: SystemRole) => (
                                  <span key={r} style={{ fontSize: 11, background: "var(--muted)", color: "var(--muted-foreground)", borderRadius: 999, padding: "3px 8px", fontWeight: 600 }}>
                                    {roleLabel(r)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: "14px 20px" }}>
                              <span style={{ fontSize: 12, background: u.isActive ? "var(--success-bg)" : "var(--danger-bg)", color: u.isActive ? "var(--success)" : "var(--danger)", borderRadius: 999, padding: "3px 10px", fontWeight: 600 }}>
                                {u.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td style={{ padding: "14px 20px" }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                {/* Edit role */}
                                <button
                                  title="Change role"
                                  onClick={() => { setEditUser(u); setEditRole(u.role); setEditAdditionalRoles(u.additionalRoles ?? []) }}
                                  style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}
                                >
                                  <Pencil size={12} /> Role
                                </button>
                                {/* Reset password */}
                                <button
                                  title="Reset password"
                                  onClick={() => { setResetPwUser(u); setNewPassword("") }}
                                  style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}
                                >
                                  <KeyRound size={12} /> Password
                                </button>
                                {/* Toggle active */}
                                {u.id !== currentUser?.id && (
                                  <button
                                    title={u.isActive ? "Deactivate" : "Reactivate"}
                                    onClick={() => toggleActive(u)}
                                    style={{ background: u.isActive ? "var(--danger-bg)" : "var(--success-bg)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: u.isActive ? "var(--danger)" : "var(--success)", fontWeight: 600 }}
                                  >
                                    {u.isActive ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                            {userSearch ? "No users match your search." : "No users found."}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
          {/* ── Approval Workflow ── */}
          {tab === "workflow" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Approval Workflows</h3>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Configure role approval chains per category</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {workflowSaved && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--success)" }}>
                      <Check size={13} /> Saved
                    </span>
                  )}
                  <button onClick={() => setWfNewCatOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
                    <Plus size={13} /> New Category
                  </button>
                  <button onClick={saveWorkflow} disabled={workflowSaving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white" }}>
                    {workflowSaving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : <><Check size={13} /> Save All</>}
                  </button>
                </div>
              </div>

              {workflowLoading && (
                <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, gap: 10, color: "var(--muted-foreground)" }}>
                  <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} />
                  <span style={{ fontSize: 13 }}>Loading…</span>
                </Card>
              )}

              {!workflowLoading && wfCats.map((cat, catIdx) => (
                <Card key={cat.id}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{cat.name}
                        {cat.isSystem && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "var(--primary-50, #EBF3FF)", color: "var(--primary)" }}>System</span>}
                      </div>
                      {cat.description && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{cat.description}</div>}
                    </div>
                    {!cat.isSystem && (
                      <button onClick={() => wfDeleteCat(cat.id)} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "var(--danger)" }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div style={{ padding: "16px 18px" }}>
                    {cat.chain.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic", marginBottom: 12 }}>No steps yet — add approver roles below.</div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 14 }}>
                        {cat.chain.map((step: any, stepIdx: number) => (
                          <div key={stepIdx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: step.type === "employee" ? "var(--primary-50,#f0fdf4)" : "var(--muted)", border: `1px solid ${step.type === "employee" ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, padding: "8px 12px", minWidth: 120 }}>
                              {step.type === "employee" && (
                                <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)", marginBottom: 1 }}>Person</span>
                              )}
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", textAlign: "center" }}>{step.label}</span>
                              {step.jobTitle && <span style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "center" }}>{step.jobTitle}</span>}
                              <select
                                value={step.deadlineHours}
                                onChange={e => wfSetDeadline(catIdx, stepIdx, Number(e.target.value))}
                                style={{ fontSize: 10, padding: "2px 4px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--background)", color: "var(--muted-foreground)", marginTop: 2 }}
                              >
                                {[4, 8, 12, 24, 48, 72, 96].map(h => (
                                  <option key={h} value={h}>{h < 24 ? `${h}h` : `${h / 24}d`}</option>
                                ))}
                              </select>
                              <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                                <button onClick={() => wfMoveStep(catIdx, stepIdx, -1)} disabled={stepIdx === 0} title="Move left"
                                  style={{ background: "none", border: "none", cursor: stepIdx === 0 ? "default" : "pointer", color: "var(--muted-foreground)", padding: "1px 3px", opacity: stepIdx === 0 ? 0.3 : 1 }}>
                                  <ChevronUp size={11} />
                                </button>
                                <button onClick={() => wfMoveStep(catIdx, stepIdx, 1)} disabled={stepIdx === cat.chain.length - 1} title="Move right"
                                  style={{ background: "none", border: "none", cursor: stepIdx === cat.chain.length - 1 ? "default" : "pointer", color: "var(--muted-foreground)", padding: "1px 3px", opacity: stepIdx === cat.chain.length - 1 ? 0.3 : 1 }}>
                                  <ChevronDown size={11} />
                                </button>
                                <button onClick={() => wfRemoveStep(catIdx, stepIdx)} title="Remove step"
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "1px 3px" }}>
                                  <X size={11} />
                                </button>
                              </div>
                            </div>
                            {stepIdx < cat.chain.length - 1 && <ArrowRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
                          </div>
                        ))}
                      </div>
                    )}

                    {wfAddStep?.catIdx === catIdx ? (
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px dashed var(--border)", borderRadius: 8, background: "var(--muted)" }}>
                        {/* Type toggle */}
                        <div style={{ display: "flex", borderRadius: 7, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                          {(["role", "employee"] as const).map(t => (
                            <button key={t} onClick={() => setWfAddStep(s => s ? { ...s, type: t, role: "", employeeId: "" } : null)}
                              style={{ padding: "5px 11px", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", background: wfAddStep.type === t ? "var(--primary)" : "var(--background)", color: wfAddStep.type === t ? "white" : "var(--muted-foreground)", textTransform: "capitalize" }}>
                              {t === "role" ? "Role" : "Person"}
                            </button>
                          ))}
                        </div>

                        {wfAddStep.type === "role" ? (
                          <select
                            value={wfAddStep.role}
                            onChange={e => setWfAddStep(s => s ? { ...s, role: e.target.value } : null)}
                            style={{ ...inp, flex: 1, minWidth: 160, maxWidth: 220, fontSize: 12, padding: "6px 10px" }}
                          >
                            <option value="">Select role…</option>
                            {APPROVER_ROLES.filter(r => !cat.chain.some((s: any) => s.type !== "employee" && s.role === r.key)).map(r => (
                              <option key={r.key} value={r.key}>{r.label}</option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={wfAddStep.employeeId}
                            onChange={e => setWfAddStep(s => s ? { ...s, employeeId: e.target.value } : null)}
                            style={{ ...inp, flex: 1, minWidth: 160, maxWidth: 260, fontSize: 12, padding: "6px 10px" }}
                          >
                            <option value="">Select employee…</option>
                            {wfEmpList.filter(e => !cat.chain.some((s: any) => s.type === "employee" && s.employeeId === e.id)).map(e => (
                              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.jobTitle ? ` — ${e.jobTitle}` : ""}</option>
                            ))}
                          </select>
                        )}

                        <select
                          value={wfAddStep.deadlineHours}
                          onChange={e => setWfAddStep(s => s ? { ...s, deadlineHours: Number(e.target.value) } : null)}
                          style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 12, background: "var(--background)", color: "var(--foreground)" }}
                        >
                          {[4, 8, 12, 24, 48, 72, 96].map(h => (
                            <option key={h} value={h}>{h < 24 ? `${h}h` : `${h / 24}d`}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => wfAddStepToChain(catIdx)}
                          disabled={wfAddStep.type === "role" ? !wfAddStep.role : !wfAddStep.employeeId}
                          style={{ padding: "6px 14px", background: "var(--primary)", color: "white", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: (wfAddStep.type === "role" ? !wfAddStep.role : !wfAddStep.employeeId) ? 0.5 : 1 }}>
                          Add
                        </button>
                        <button onClick={() => setWfAddStep(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setWfAddStep({ catIdx, type: "role", role: "", employeeId: "", deadlineHours: 24 })}
                        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "1px dashed var(--primary)", borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}>
                        <Plus size={12} /> Add Step
                      </button>
                    )}
                  </div>
                </Card>
              ))}

              {/* New Category Modal */}
              {wfNewCatOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div style={{ background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>New Workflow Category</div>
                      <button onClick={() => setWfNewCatOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={16} /></button>
                    </div>
                    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <label style={labelStyle}>Category Name <span style={{ color: "var(--accent)" }}>*</span></label>
                        <input value={wfNewCatForm.name} onChange={e => setWfNewCatForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="e.g. Document Sign-off" />
                      </div>
                      <div>
                        <label style={labelStyle}>Description</label>
                        <input value={wfNewCatForm.description} onChange={e => setWfNewCatForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="Brief description" />
                      </div>
                    </div>
                    <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button onClick={() => setWfNewCatOpen(false)} style={{ padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                      <button onClick={wfAddCategory} disabled={!wfNewCatForm.name.trim()} style={{ padding: "7px 16px", background: "var(--primary)", color: "white", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: !wfNewCatForm.name.trim() ? 0.5 : 1 }}>Create</button>
                    </div>
                  </div>
                </div>
              )}
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* ── Custom Roles ── */}
          {tab === "custom-roles" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Custom Roles</h3>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Create roles that combine permissions from system roles</p>
                </div>
                <Button size="sm" onClick={() => setNewRoleOpen(true)}><Plus size={14} /> New Role</Button>
              </div>

              {customRolesLoading && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, gap: 10, color: "var(--muted-foreground)" }}>
                  <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  <span style={{ fontSize: 13 }}>Loading…</span>
                </div>
              )}

              {!customRolesLoading && customRoles.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "40px 24px", textAlign: "center" }}>
                  <ShieldCheck size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No custom roles yet. Create one by selecting granular permissions.</div>
                </div>
              )}

              {!customRolesLoading && customRoles.length > 0 && (
                <div>
                  {customRoles.map((role: any) => {
                    // duties are keys like "canViewPayslips"; look up human labels
                    const allDuties = DUTY_GROUPS.flatMap(g => g.duties)
                    const dutyLabels = (role.duties ?? []).map((k: string) => allDuties.find(d => d.key === k)?.label ?? k.replace(/^can/, "").replace(/([A-Z])/g, " $1").trim())
                    return (
                      <div key={role.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 9, background: "var(--primary-50, #EBF3FF)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <ShieldCheck size={18} style={{ color: "var(--primary)" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{role.name}</div>
                          {role.description && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{role.description}</div>}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                            {dutyLabels.slice(0, 8).map((p: string) => (
                              <span key={p} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "var(--success-bg)", color: "var(--success)", fontWeight: 600 }}>{p}</span>
                            ))}
                            {dutyLabels.length > 8 && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>+{dutyLabels.length - 8} more</span>}
                          </div>
                        </div>
                        <button onClick={() => deleteCustomRole(role.id)} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "var(--danger)", flexShrink: 0 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}

          {/* New Custom Role Modal */}
          {newRoleOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>New Custom Role</div>
                  <button onClick={() => setNewRoleOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={16} /></button>
                </div>
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Role Name <span style={{ color: "var(--accent)" }}>*</span></label>
                      <input value={newRoleForm.name} onChange={e => setNewRoleForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="e.g. Payslip Officer" />
                    </div>
                    <div>
                      <label style={labelStyle}>Description</label>
                      <input value={newRoleForm.description} onChange={e => setNewRoleForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="Brief description" />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Permissions <span style={{ color: "var(--accent)" }}>*</span></label>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{newRoleForm.duties.length} selected</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {DUTY_GROUPS.map(grp => (
                        <div key={grp.group}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>{grp.group}</div>
                            <button type="button" onClick={() => {
                              const allKeys = grp.duties.map(d => d.key)
                              const allSelected = allKeys.every(k => newRoleForm.duties.includes(k))
                              setNewRoleForm(f => ({ ...f, duties: allSelected ? f.duties.filter(d => !allKeys.includes(d)) : [...new Set([...f.duties, ...allKeys])] }))
                            }} style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              {grp.duties.every(d => newRoleForm.duties.includes(d.key)) ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 4 }}>
                            {grp.duties.map(duty => {
                              const selected = newRoleForm.duties.includes(duty.key)
                              return (
                                <label key={duty.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`, background: selected ? "var(--primary-50, #EBF3FF)" : "transparent", cursor: "pointer" }}>
                                  <input type="checkbox" checked={selected} onChange={() => setNewRoleForm(f => ({ ...f, duties: selected ? f.duties.filter(d => d !== duty.key) : [...f.duties, duty.key] }))} style={{ width: 13, height: 13, flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, fontWeight: selected ? 600 : 400, color: selected ? "var(--primary)" : "var(--foreground)" }}>{duty.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setNewRoleOpen(false)} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
                  <button onClick={saveCustomRole} disabled={newRoleSaving || !newRoleForm.name || newRoleForm.duties.length === 0} style={{ padding: "8px 18px", border: "none", borderRadius: 8, background: "var(--primary)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: (!newRoleForm.name || newRoleForm.duties.length === 0) ? 0.5 : 1 }}>
                    {newRoleSaving ? "Creating…" : "Create Role"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Branding & Customization ── */}
          {tab === "branding" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Branding &amp; Customization</h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Personalize the look and feel of your HRMS</p>
              </div>
              <form onSubmit={saveBranding}>
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

                  {brandingSaved && (
                    <div style={{ background: "var(--success-bg, #E6F4EA)", color: "var(--success, #1A7336)", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
                      Branding settings saved successfully.
                    </div>
                  )}

                  {/* Logo */}
                  <div>
                    <label style={labelStyle}>Organization Logo</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 80, height: 80, borderRadius: 12, border: "1px solid var(--border)", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {logoPreview
                          ? <img src={logoPreview} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          : <Upload size={24} style={{ color: "var(--muted-foreground)" }} />
                        }
                      </div>
                      <div>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                          <Upload size={13} /> Upload Logo
                          <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: "none" }} />
                        </label>
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5 }}>PNG, JPG or SVG. Max 2 MB.</p>
                      </div>
                    </div>
                  </div>

                  {/* Org name */}
                  <div>
                    <label style={labelStyle}>Organization Name</label>
                    <input
                      value={brandingForm.orgName}
                      onChange={e => setBrandingForm(f => ({ ...f, orgName: e.target.value }))}
                      style={inp}
                      placeholder="e.g. DataSphere Nigeria"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 20 }}>
                    {/* Font */}
                    <div>
                      <label style={labelStyle}>System Font</label>
                      <select value={brandingForm.font} onChange={e => setBrandingForm(f => ({ ...f, font: e.target.value }))} style={inp}>
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Lato">Lato</option>
                      </select>
                    </div>

                    {/* Primary color */}
                    <div>
                      <label style={labelStyle}>Primary Color</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          type="color"
                          value={brandingForm.primaryColor}
                          onChange={e => setBrandingForm(f => ({ ...f, primaryColor: e.target.value }))}
                          style={{ width: 44, height: 38, padding: 2, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", background: "var(--background)" }}
                        />
                        <input
                          value={brandingForm.primaryColor}
                          onChange={e => setBrandingForm(f => ({ ...f, primaryColor: e.target.value }))}
                          style={{ ...inp, flex: 1, fontFamily: "monospace" }}
                          placeholder="#0052A5"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Wallpaper */}
                  <div>
                    <label style={labelStyle}>Dashboard Wallpaper</label>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ width: 140, height: 84, borderRadius: 10, border: "1px solid var(--border)", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {wallpaperPreview
                          ? <img src={wallpaperPreview} alt="Wallpaper preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <Upload size={22} style={{ color: "var(--muted-foreground)" }} />
                        }
                      </div>
                      <div>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                          <Upload size={13} /> Upload Wallpaper
                          <input type="file" accept="image/*" onChange={handleWallpaperChange} style={{ display: "none" }} />
                        </label>
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5 }}>Recommended: 1920×1080 or wider. Max 5 MB.</p>
                        {wallpaperPreview && (
                          <button type="button" onClick={() => setWallpaperPreview(null)} style={{ marginTop: 6, fontSize: 11, color: "var(--danger, #C0392B)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Remove wallpaper</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                  <Button type="submit" loading={brandingSaving}><Palette size={14} /> {brandingSaving ? "Saving…" : "Save Branding"}</Button>
                </div>
              </form>
            </Card>
          )}

        </div>
      </div>

      {/* ── Department Modal (Add / Edit) ── */}
      <Modal open={deptOpen} onClose={() => { setDeptOpen(false); setEditingDept(null) }} title={editingDept ? "Edit Department" : "Add Department"} width={440}>
        <form onSubmit={saveDept}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {settingsError && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
            <div><label style={labelStyle}>Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={deptForm.name} onChange={e => setDeptForm(f => ({...f, name: e.target.value}))} style={inp} /></div>
            <div><label style={labelStyle}>Description</label><input value={deptForm.description} onChange={e => setDeptForm(f => ({...f, description: e.target.value}))} style={inp} /></div>
            {divisions.length > 0 && (
              <div>
                <label style={labelStyle}>Division</label>
                <select value={deptForm.divisionId} onChange={e => setDeptForm(f => ({...f, divisionId: e.target.value}))} style={inp}>
                  <option value="">No division</option>
                  {divisions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => { setDeptOpen(false); setEditingDept(null) }}>Cancel</Button>
            <Button type="submit">{editingDept ? "Save Changes" : "Add Department"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Leave Type Modal (Add / Edit) ── */}
      <Modal open={leaveOpen} onClose={() => { setLeaveOpen(false); setEditingLeave(null) }} title={editingLeave ? "Edit Leave Type" : "Add Leave Type"} width={480}>
        <form onSubmit={saveLeave}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {settingsError && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
            <div><label style={labelStyle}>Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={leaveForm.name} onChange={e => setLeaveForm(f => ({...f, name: e.target.value}))} style={inp} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
              <div><label style={labelStyle}>Default Days</label><input type="number" value={leaveForm.defaultDays} onChange={e => setLeaveForm(f => ({...f, defaultDays: e.target.value}))} style={inp} /></div>
              <div><label style={labelStyle}>Notice Period (days)</label><input type="number" value={leaveForm.waitingDays} onChange={e => setLeaveForm(f => ({...f, waitingDays: e.target.value}))} style={inp} /></div>
            </div>
            <div><label style={labelStyle}>Gender Restriction</label><select value={leaveForm.genderSpecific} onChange={e => setLeaveForm(f => ({...f, genderSpecific: e.target.value}))} style={inp}><option value="">All genders</option><option value="MALE">Male only</option><option value="FEMALE">Female only</option></select></div>
            <div style={{ display: "flex", gap: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={leaveForm.requiresDoc} onChange={e => setLeaveForm(f => ({...f, requiresDoc: e.target.checked}))} /> Requires supporting document</label>
              {editingLeave && <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={leaveForm.isActive} onChange={e => setLeaveForm(f => ({...f, isActive: e.target.checked}))} /> Active</label>}
            </div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => { setLeaveOpen(false); setEditingLeave(null) }}>Cancel</Button>
            <Button type="submit">{editingLeave ? "Save Changes" : "Add Leave Type"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Holiday Modal (Add / Edit) ── */}
      <Modal open={holidayOpen} onClose={() => { setHolidayOpen(false); setEditingHoliday(null) }} title={editingHoliday ? "Edit Holiday" : "Add Public Holiday"} width={400}>
        <form onSubmit={saveHoliday}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {settingsError && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
            <div><label style={labelStyle}>Holiday Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={holidayForm.name} onChange={e => setHolidayForm(f => ({...f, name: e.target.value}))} style={inp} /></div>
            <div><label style={labelStyle}>Date <span style={{ color: "var(--accent)" }}>*</span></label><input type="date" required value={holidayForm.date} onChange={e => setHolidayForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => { setHolidayOpen(false); setEditingHoliday(null) }}>Cancel</Button>
            <Button type="submit">{editingHoliday ? "Save Changes" : "Add Holiday"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Add User Modal ── */}
      <Modal open={addUserOpen} onClose={() => setAddUserOpen(false)} title="Add System User" width={560}>
        <form onSubmit={createUser}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {userError && (
              <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{userError}</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
              <div><label style={labelStyle}>First Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={userForm.firstName} onChange={e => setUserForm(f => ({...f, firstName: e.target.value}))} style={inp} /></div>
              <div><label style={labelStyle}>Last Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={userForm.lastName} onChange={e => setUserForm(f => ({...f, lastName: e.target.value}))} style={inp} /></div>
            </div>

            <div><label style={labelStyle}>Work Email <span style={{ color: "var(--accent)" }}>*</span></label><input type="email" required value={userForm.email} onChange={e => setUserForm(f => ({...f, email: e.target.value}))} style={inp} /></div>

            <div>
              <label style={labelStyle}>Temporary Password <span style={{ color: "var(--accent)" }}>*</span></label>
              <input type="password" required minLength={6} value={userForm.password} onChange={e => setUserForm(f => ({...f, password: e.target.value}))} style={inp} placeholder="Default: dsn-staff" />
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>Leave blank to use default <strong>dsn-staff</strong></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
              <div>
                <label style={labelStyle}>System Role <span style={{ color: "var(--accent)" }}>*</span></label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({...f, role: e.target.value as SystemRole}))} style={inp}>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Employment Type</label>
                <select value={userForm.employmentType} onChange={e => setUserForm(f => ({...f, employmentType: e.target.value}))} style={inp}>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="STAFF">Intern</option>
                  <option value="NYSC">NYSC</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
              <div>
                <label style={labelStyle}>Job Title</label>
                <input value={userForm.jobTitle} onChange={e => setUserForm(f => ({...f, jobTitle: e.target.value}))} style={inp} placeholder="e.g. Software Engineer" />
              </div>
              <div>
                <label style={labelStyle}>Employee ID</label>
                <input value={userForm.employeeId} onChange={e => setUserForm(f => ({...f, employeeId: e.target.value}))} style={inp} placeholder="Auto-generated if blank" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Department</label>
              <select value={userForm.departmentId} onChange={e => setUserForm(f => ({...f, departmentId: e.target.value}))} style={inp}>
                <option value="">No department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Role Modal ── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Change User Role" width={480}>
        {editUser && (
          <div style={{ display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--muted)", borderRadius: 10 }}>
                <Avatar name={editUser.name ?? editUser.email ?? "?"} size={40} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{editUser.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{editUser.email}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{editUser.employee?.employeeId}</div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Primary Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value as SystemRole)} style={inp}>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Additional Roles</label>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>
                  Employee can switch between all assigned roles. Primary role is their default.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {ALL_ROLES.filter(r => r !== editRole).map(r => {
                    const checked = editAdditionalRoles.includes(r)
                    return (
                      <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, border: `1px solid ${checked ? "var(--primary)" : "var(--border)"}`, background: checked ? "var(--primary-50, #EBF3FF)" : "transparent", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setEditAdditionalRoles(prev => checked ? prev.filter(x => x !== r) : [...prev, r])}
                          style={{ width: 14, height: 14, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 12, fontWeight: checked ? 600 : 400, color: checked ? "var(--primary)" : "var(--foreground)", flex: 1 }}>{roleLabel(r)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              {editUser.id === currentUser?.id && (
                <div style={{ background: "var(--warning-bg, #FFF8E1)", color: "var(--warning, #F59E0B)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                  You are changing your own role. You will be signed out after saving.
                </div>
              )}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={updateRole} disabled={saving}>{saving ? "Saving..." : "Save Role"}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal open={!!resetPwUser} onClose={() => setResetPwUser(null)} title="Reset Password" width={400}>
        {resetPwUser && (
          <form onSubmit={resetPassword}>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--muted)", borderRadius: 10 }}>
                <Avatar name={resetPwUser.name ?? resetPwUser.email ?? "?"} size={40} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{resetPwUser.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{resetPwUser.email}</div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>New Password <span style={{ color: "var(--accent)" }}>*</span></label>
                <input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inp} placeholder="Min 6 characters" />
              </div>
              <button type="button" onClick={() => setNewPassword("dsn-staff")}
                style={{ fontSize: 12, color: "var(--primary)", background: "var(--primary-50, #EBF3FF)", border: "1px solid var(--primary)", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontWeight: 600, textAlign: "left" }}>
                Use default password: <strong>dsn-staff</strong>
              </button>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="secondary" onClick={() => setResetPwUser(null)}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={saving}>{saving ? "Resetting..." : "Reset Password"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
