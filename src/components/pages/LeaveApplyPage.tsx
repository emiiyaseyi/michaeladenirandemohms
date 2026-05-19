"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import {
  ArrowLeft, Check, ChevronRight, AlertCircle, Users, Loader2,
  Info, Plus, X, ShieldCheck, CalendarDays, FileText,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { addBusinessDays, format, parseISO, isWeekend } from "date-fns"

type PLEntry = { employeeId: string; taskName: string; taskDescription: string; relieverId: string; documentUrl: string }

type Form = {
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  reason: string
  documentUrl: string
  projectLeads: PLEntry[]
}

const STEPS = [
  { n: 1, label: "Leave Type" },
  { n: 2, label: "Dates" },
  { n: 3, label: "Project Lead(s)" },
  { n: 4, label: "Handover & Details" },
  { n: 5, label: "Review & Submit" },
]

function StepHeader({
  step, current, completed, label, summary, onClick,
}: {
  step: number; current: number; completed: boolean; label: string; summary?: string; onClick?: () => void
}) {
  const isActive = step === current
  const isLocked = step > current && !completed
  const canClick = completed && !isActive

  return (
    <button
      onClick={canClick ? onClick : undefined}
      disabled={isLocked}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14,
        padding: "14px 20px", background: "transparent", border: "none",
        cursor: canClick ? "pointer" : "default", textAlign: "left",
        borderBottom: isActive ? "none" : "1px solid var(--border)",
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800,
        background: completed ? "var(--success)" : isActive ? "var(--primary)" : "var(--muted)",
        color: completed || isActive ? "white" : "var(--muted-foreground)",
        transition: "all .2s",
      }}>
        {completed ? <Check size={13} /> : step}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: isLocked ? "var(--muted-foreground)" : isActive ? "var(--foreground)" : "var(--foreground)",
        }}>
          {label}
        </div>
        {completed && summary && (
          <div style={{ fontSize: 12, color: "var(--success)", marginTop: 1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {summary}
          </div>
        )}
      </div>
      {completed && !isActive && (
        <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700, flexShrink: 0 }}>Edit</span>
      )}
      {isLocked && (
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }}>Locked</span>
      )}
    </button>
  )
}

export default function LeaveApplyPage({ basePath, userCaps, isAdmin }: {
  basePath: string
  userCaps?: any
  isAdmin: boolean
}) {
  const router = useRouter()

  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [projectLeadEmployees, setProjectLeadEmployees] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [employeeGender, setEmployeeGender] = useState<string>("")
  const [employeeJobTitle, setEmployeeJobTitle] = useState<string>("")
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState(1)
  const [completedUpTo, setCompletedUpTo] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calcDays, setCalcDays] = useState(0)
  const [holidays, setHolidays] = useState<any[]>([])
  const [docUploading, setDocUploading] = useState(false)
  const [plDocUploading, setPlDocUploading] = useState<Record<number, boolean>>({})

  const [plSearch, setPLSearch] = useState("")
  const [plDropOpen, setPLDropOpen] = useState(false)
  const plSearchRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<Form>({
    employeeId: "", leaveTypeId: "", startDate: "", endDate: "",
    reason: "", documentUrl: "", projectLeads: [],
  })

  // ── Load data ────────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/leave").then(r => r.json()),
      fetch("/api/self-service/profile").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/self-service/employee-raw").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([ld, pd, empRaw]) => {
      setLeaveTypes(ld.leaveTypes ?? [])
      setEmployees(ld.employees ?? [])
      setProjectLeadEmployees(ld.projectLeadEmployees ?? [])
      if (pd) setBalances(pd.leaveBalances ?? [])
      if (empRaw?.employee?.gender) setEmployeeGender(empRaw.employee.gender)
      if (empRaw?.employee?.jobTitle) setEmployeeJobTitle(empRaw.employee.jobTitle)
      if (empRaw?.employee?.id) setCurrentUserEmployeeId(empRaw.employee.id)
    }).finally(() => setLoading(false))
  }, [])

  // ── Day calc ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!form.startDate || !form.endDate || !form.leaveTypeId) { setCalcDays(0); return }
    fetch(`/api/leave/calculate-days?start=${form.startDate}&end=${form.endDate}&leaveTypeId=${form.leaveTypeId}`)
      .then(r => r.json()).then(d => { setCalcDays(d.days ?? 0); setHolidays(d.holidays ?? []) }).catch(() => {})
  }, [form.startDate, form.endDate, form.leaveTypeId])

  // ── PL dropdown click-outside ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!plSearchRef.current?.contains(e.target as Node)) setPLDropOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const selType = leaveTypes.find(t => t.id === form.leaveTypeId)
  // If the selected type deducts from Annual Leave, surface the Annual Leave balance instead
  const annualLeaveType = leaveTypes.find(t => t.name === "Annual Leave")
  const balanceSourceTypeId = selType?.deductFromAnnual && annualLeaveType ? annualLeaveType.id : form.leaveTypeId
  const selBal = balances.find(b => b.leaveTypeId === balanceSourceTypeId)
  const applicantId = form.employeeId || currentUserEmployeeId

  // Resolve the applicant's gender + jobTitle to filter what they can apply for.
  // When admin is applying on behalf of someone else, use that employee's data.
  const applicantEmp: any = form.employeeId ? employees.find((e: any) => e.id === form.employeeId) : null
  const applicantGender = applicantEmp?.gender ?? employeeGender
  const applicantJobTitle: string = applicantEmp?.jobTitle ?? employeeJobTitle
  const applicantIsIntern = (applicantJobTitle ?? "").toLowerCase().includes("intern")

  // Leave types interns are entitled to ON TOP of intern-only ones (e.g. Casual).
  // Annual + Sick + Compassionate + Study are full-employee benefits — interns don't get them.
  const INTERN_ALLOWED_NON_INTERN_TYPES = ["Maternity Leave", "Paternity Leave"]

  const visibleTypes = leaveTypes.filter(lt => {
    // Hide intern-only types from non-interns. Admin override doesn't apply —
    // the API enforces this server-side too, so even an admin acting on behalf
    // of a non-intern can't apply for an intern-only type for them.
    if (lt.internOnly && !applicantIsIntern) return false
    // Interns only see intern-only types + a whitelist (Sick / Compassionate / Maternity / Paternity).
    if (applicantIsIntern && !lt.internOnly && !INTERN_ALLOWED_NON_INTERN_TYPES.includes(lt.name)) return false
    // Gender filter
    if (!lt.genderSpecific) return true
    if (!applicantGender) return true
    return lt.genderSpecific === applicantGender
  })

  const getMinDate = () => {
    const notice = selType?.minNoticeDays ?? 0
    if (notice <= 0 || isAdmin) return format(new Date(), "yyyy-MM-dd")
    return format(addBusinessDays(new Date(), notice), "yyyy-MM-dd")
  }

  const selectedPLIds = form.projectLeads.map(p => p.employeeId)
  const filteredPLs = projectLeadEmployees.filter((e: any) =>
    e.id !== applicantId && !selectedPLIds.includes(e.id) &&
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(plSearch.toLowerCase())
  )

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const updatePL = (i: number, field: keyof PLEntry, value: string) => {
    setForm(f => { const pls = [...f.projectLeads]; pls[i] = { ...pls[i], [field]: value }; return { ...f, projectLeads: pls } })
    if (field === "taskName") setErrors(e => { const n = { ...e }; delete n[`taskName_${i}`]; return n })
  }
  const removePL = (i: number) => setForm(f => ({ ...f, projectLeads: f.projectLeads.filter((_, idx) => idx !== i) }))
  const addPL = (empId: string) => {
    if (form.projectLeads.some(p => p.employeeId === empId)) return
    setForm(f => ({ ...f, projectLeads: [...f.projectLeads, { employeeId: empId, taskName: "", taskDescription: "", relieverId: "", documentUrl: "" }] }))
    setErrors(e => { const n = { ...e }; delete n.pl; return n })
    setPLSearch(""); setPLDropOpen(false)
  }

  // ── Step summaries ───────────────────────────────────────────────────────────

  const stepSummary = (n: number): string => {
    if (n === 1) return selType?.name ?? ""
    if (n === 2) {
      if (!form.startDate || !form.endDate) return ""
      return `${formatDate(form.startDate, "MMM d")} → ${formatDate(form.endDate, "MMM d")} (${calcDays} day${calcDays !== 1 ? "s" : ""})`
    }
    if (n === 3) {
      const names = form.projectLeads.map(pl => {
        const e = employees.find((x: any) => x.id === pl.employeeId)
        return e ? `${e.firstName} ${e.lastName}` : ""
      }).filter(Boolean)
      return names.join(", ")
    }
    if (n === 4) return form.reason ? form.reason.slice(0, 60) + (form.reason.length > 60 ? "…" : "") : ""
    return ""
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {}
    if (s === 1 && !form.leaveTypeId) e.leaveTypeId = "Select a leave type"
    if (s === 2) {
      if (!form.startDate) e.startDate = "Required"
      if (!form.endDate) e.endDate = "Required"
      if (form.startDate && isWeekend(parseISO(form.startDate))) e.startDate = "Start date cannot be a weekend"
      if (form.endDate && isWeekend(parseISO(form.endDate))) e.endDate = "End date cannot be a weekend"
      if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = "End date must be after start date"
      if (form.startDate && form.endDate && !e.startDate && !e.endDate && calcDays === 0) e.endDate = "No working days in this range"
    }
    if (s === 3) {
      if (form.projectLeads.length === 0) e.pl = "At least one Project Lead is required"
      form.projectLeads.forEach((pl, i) => { if (!pl.taskName.trim()) e[`taskName_${i}`] = "Task name required" })
    }
    if (s === 4) {
      if (!form.reason.trim()) e.reason = "Required"
      if (selType?.requiresDoc && calcDays >= selType.minDocDays && !form.documentUrl) e.doc = "A supporting document is required"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (!validate(step)) return
    const nextStep = step + 1
    setCompletedUpTo(Math.max(completedUpTo, step))
    setStep(nextStep)
  }
  const prev = () => setStep(s => Math.max(1, s - 1))
  const goTo = (n: number) => { if (n <= completedUpTo) setStep(n) }

  // ── Submit ───────────────────────────────────────────────────────────────────

  const submit = async () => {
    if (!validate(5)) return
    setSubmitting(true)
    const body = { ...form, days: calcDays, bypassWaitingPeriod: isAdmin }
    const r = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSubmitting(false)
    if (r.ok) {
      router.push(`${basePath}/requests/leave`)
    } else {
      const d = await r.json()
      setErrors({ submit: d.error ?? "Submission failed" })
    }
  }

  // ── Input style ──────────────────────────────────────────────────────────────

  const fi = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  } as const

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, color: "var(--muted-foreground)", gap: 10 }}>
        <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} />
        Loading…
      </div>
    )
  }

  return (
    <div>
      {/* Back */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href={`${basePath}/requests/leave`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none" }}
        >
          <ArrowLeft size={14} /> Back to Leave Requests
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Apply for Leave</h1>
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>Complete each step to submit your leave request.</p>

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
        {STEPS.map(s => {
          const isActive = step === s.n
          const isDone = completedUpTo >= s.n && step !== s.n

          return (
            <div key={s.n}>
              <StepHeader
                step={s.n}
                current={step}
                completed={isDone}
                label={s.label}
                summary={isDone ? stepSummary(s.n) : undefined}
                onClick={() => goTo(s.n)}
              />

              {/* Active step content */}
              {isActive && (
                <div style={{ padding: "0 20px 20px" }}>
                  {/* ── Step 1: Leave Type ── */}
                  {step === 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {userCaps?.canViewAllLeave && (
                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Applying for</label>
                          <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value, projectLeads: [] }))} style={fi}>
                            <option value="">Myself</option>
                            {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Leave Type <span style={{ color: "var(--accent)" }}>*</span></label>
                        {visibleTypes.length === 0 && (
                          <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: 16, textAlign: "center" }}>No leave types available</div>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: 10 }}>
                          {visibleTypes.map(lt => {
                            const bal = balances.find(b => b.leaveTypeId === lt.id)
                            const exhausted = bal ? bal.remaining <= 0 : false
                            const sel = form.leaveTypeId === lt.id
                            const pct = bal && bal.allocated > 0 ? Math.min(100, (bal.remaining / bal.allocated) * 100) : 0
                            const barColor = pct > 50 ? "var(--success)" : pct > 20 ? "var(--warning)" : "var(--accent)"
                            return (
                              <button key={lt.id} disabled={exhausted} onClick={() => !exhausted && setForm(f => ({ ...f, leaveTypeId: lt.id }))}
                                style={{
                                  padding: "16px 16px 14px", borderRadius: 12,
                                  border: `2px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                                  background: sel ? "var(--primary-50)" : exhausted ? "var(--muted)" : "var(--background)",
                                  cursor: exhausted ? "not-allowed" : "pointer", textAlign: "left",
                                  transition: "all .15s", opacity: exhausted ? 0.5 : 1,
                                  display: "flex", flexDirection: "column", gap: 10,
                                  boxShadow: sel ? "0 0 0 4px rgba(var(--primary-rgb, 18,163,85), 0.08)" : "none",
                                }}
                                onMouseEnter={e => { if (!exhausted && !sel) { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLElement).style.background = "var(--muted)" } }}
                                onMouseLeave={e => { if (!sel) { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = exhausted ? "var(--muted)" : "var(--background)" } }}
                              >
                                {/* Top: name + check */}
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: sel ? "var(--primary)" : exhausted ? "var(--muted-foreground)" : "var(--foreground)" }}>{lt.name}</span>
                                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${sel ? "var(--primary)" : "var(--border)"}`, background: sel ? "var(--primary)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, transition: "all .15s" }}>
                                    {sel && <Check size={10} color="white" />}
                                  </div>
                                </div>

                                {/* Balance */}
                                {bal && !exhausted && (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                                      <span style={{ fontSize: 22, fontWeight: 900, color: barColor, lineHeight: 1 }}>{bal.remaining}</span>
                                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/ {bal.allocated} days</span>
                                    </div>
                                    <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                                      <div style={{ height: "100%", width: `${pct}%`, background: barColor, transition: "width .4s" }} />
                                    </div>
                                  </div>
                                )}
                                {exhausted && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>Balance exhausted</div>}

                                {/* Tags */}
                                {(lt.minNoticeDays > 0 && !isAdmin && !exhausted) || (lt.genderSpecific && !exhausted) || lt.deductFromAnnual || lt.internOnly ? (
                                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                    {lt.minNoticeDays > 0 && !isAdmin && !exhausted && (
                                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "rgba(234,179,8,0.12)", color: "var(--warning)" }}>{lt.minNoticeDays}d notice</span>
                                    )}
                                    {lt.genderSpecific && !exhausted && (
                                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)" }}>{lt.genderSpecific === "FEMALE" ? "Female only" : "Male only"}</span>
                                    )}
                                    {lt.internOnly && (
                                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "var(--info-bg)", color: "var(--info)" }}>Interns only</span>
                                    )}
                                    {lt.deductFromAnnual && (
                                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)" }}>From Annual Leave</span>
                                    )}
                                  </div>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                        {errors.leaveTypeId && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 6 }}>{errors.leaveTypeId}</div>}
                      </div>
                    </div>
                  )}

                  {/* ── Step 2: Dates ── */}
                  {step === 2 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {selBal && (
                        <div style={{ background: "var(--primary-50)", border: "1px solid var(--primary)", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                          <CalendarDays size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{selType?.name}</span>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>— {selBal.remaining} days available</span>
                        </div>
                      )}
                      {selType?.minNoticeDays > 0 && !isAdmin && (
                        <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--warning)", display: "flex", gap: 8 }}>
                          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                          This leave requires {selType.minNoticeDays} working days notice. Earliest start: <strong style={{ marginLeft: 4 }}>{formatDate(getMinDate())}</strong>
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Start Date <span style={{ color: "var(--accent)" }}>*</span></label>
                          <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} min={getMinDate()} style={fi} />
                          {errors.startDate && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>{errors.startDate}</div>}
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>End Date <span style={{ color: "var(--accent)" }}>*</span></label>
                          <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} min={form.startDate || getMinDate()} style={fi} />
                          {errors.endDate && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>{errors.endDate}</div>}
                        </div>
                      </div>
                      {calcDays > 0 && (
                        <div style={{ background: "var(--muted)", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Working days</div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: 22, fontWeight: 900, color: "var(--primary)" }}>{calcDays}</span>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 4 }}>days</span>
                            {holidays.length > 0 && <div style={{ fontSize: 10, color: "var(--warning)", marginTop: 2 }}>{holidays.length} holiday{holidays.length !== 1 ? "s" : ""} excluded</div>}
                          </div>
                        </div>
                      )}
                      {selBal && calcDays > selBal.remaining && (
                        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--accent)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--accent)", display: "flex", gap: 8 }}>
                          <AlertCircle size={14} style={{ flexShrink: 0 }} />
                          Request exceeds balance ({selBal.remaining} days remaining)
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Step 3: Project Leads ── */}
                  {step === 3 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Approval chain visual */}
                      <div style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 16px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 10 }}>Approval Chain</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Users size={15} color="white" />
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--primary)" }}>You</span>
                          </div>
                          <ChevronRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                          {form.projectLeads.length === 0 ? (
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>No leads selected</span>
                          ) : (
                            <>
                              {form.projectLeads.map(pl => {
                                const plEmp = employees.find((e: any) => e.id === pl.employeeId)
                                return plEmp ? (
                                  <div key={pl.employeeId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                    <Avatar name={`${plEmp.firstName} ${plEmp.lastName}`} photo={plEmp.profilePhoto} size={34} />
                                    <span style={{ fontSize: 9, fontWeight: 600, maxWidth: 48, textAlign: "center", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{plEmp.firstName}</span>
                                  </div>
                                ) : null
                              })}
                              <ChevronRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                            </>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <ShieldCheck size={15} color="white" />
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--success)" }}>HR Admin</span>
                          </div>
                        </div>
                      </div>

                      {form.projectLeads.map((pl, i) => {
                        const plEmp = employees.find((e: any) => e.id === pl.employeeId)
                        return (
                          <div key={pl.employeeId || i} style={{ border: `1px solid ${errors[`taskName_${i}`] ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                              <Avatar name={plEmp ? `${plEmp.firstName} ${plEmp.lastName}` : "?"} photo={plEmp?.profilePhoto} size={38} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{plEmp ? `${plEmp.firstName} ${plEmp.lastName}` : "Unknown"}</div>
                                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{plEmp?.jobTitle ?? "Project Lead"}</div>
                              </div>
                              {form.projectLeads.length > 1 && (
                                <button onClick={() => removePL(i)} style={{ background: "var(--danger-bg)", border: "none", cursor: "pointer", borderRadius: 6, padding: "4px 8px", color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
                                  <X size={11} /> Remove
                                </button>
                              )}
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Task / Project Name <span style={{ color: "var(--accent)" }}>*</span></label>
                              <input placeholder="What task are you handing over?" value={pl.taskName} onChange={e => updatePL(i, "taskName", e.target.value)} style={fi} />
                              {errors[`taskName_${i}`] && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>{errors[`taskName_${i}`]}</div>}
                            </div>
                          </div>
                        )
                      })}

                      <div ref={plSearchRef} style={{ position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px dashed var(--border)", borderRadius: 8, padding: "9px 12px", background: "var(--background)" }}>
                          <Plus size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                          <input value={plSearch}
                            onChange={e => { setPLSearch(e.target.value); setPLDropOpen(true) }}
                            onFocus={() => setPLDropOpen(true)}
                            placeholder={form.projectLeads.length === 0 ? "Add a Project Lead…" : "Add another Project Lead…"}
                            style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, color: "var(--foreground)" }} />
                        </div>
                        {plDropOpen && filteredPLs.length > 0 && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 220, overflowY: "auto", marginTop: 4 }}>
                            {filteredPLs.slice(0, 8).map((e: any) => (
                              <button key={e.id} onClick={() => addPL(e.id)}
                                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                                onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                                onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = "transparent"}>
                                <Avatar name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto} size={32} />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.firstName} {e.lastName}</div>
                                  {e.jobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.jobTitle}</div>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {errors.pl && <div style={{ fontSize: 11, color: "var(--accent)" }}>{errors.pl}</div>}
                    </div>
                  )}

                  {/* ── Step 4: Handover & Details ── */}
                  {step === 4 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {form.projectLeads.map((pl, i) => {
                        const plEmp = employees.find((e: any) => e.id === pl.employeeId)
                        return (
                          <div key={pl.employeeId || i} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                              <Avatar name={plEmp ? `${plEmp.firstName} ${plEmp.lastName}` : "?"} photo={plEmp?.profilePhoto} size={28} />
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{plEmp ? `${plEmp.firstName} ${plEmp.lastName}` : "Project Lead"}</div>
                              {pl.taskName && <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, background: "var(--primary-50)", padding: "2px 8px", borderRadius: 20, marginLeft: "auto" }}>{pl.taskName}</div>}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Relief Officer <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)" }}>(optional)</span></label>
                                <select value={pl.relieverId} onChange={e => updatePL(i, "relieverId", e.target.value)} style={fi}>
                                  <option value="">No relief needed</option>
                                  {employees.filter((e: any) => e.id !== applicantId).map((e: any) => (
                                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.jobTitle ? ` — ${e.jobTitle}` : ""}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Task Description <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)" }}>(optional)</span></label>
                                <textarea value={pl.taskDescription} onChange={e => updatePL(i, "taskDescription", e.target.value)} rows={2}
                                  placeholder="Describe what the relief officer needs to know…"
                                  style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Handover Document <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)" }}>(optional)</span></label>
                                {pl.documentUrl ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: 8, padding: "10px 14px" }}>
                                    <Check size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: "var(--success)", flex: 1, fontWeight: 600 }}>Document uploaded</span>
                                    <a href={pl.documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--primary)", textDecoration: "underline" }}>View</a>
                                    <button onClick={() => updatePL(i, "documentUrl", "")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0, display: "flex" }}><X size={13} /></button>
                                  </div>
                                ) : (
                                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "2px dashed var(--border)", borderRadius: 8, cursor: plDocUploading[i] ? "not-allowed" : "pointer", fontSize: 13, color: "var(--muted-foreground)" }}
                                    onMouseEnter={e => { if (!plDocUploading[i]) (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)" }}
                                    onMouseLeave={e => { if (!plDocUploading[i]) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)" }}>
                                    {plDocUploading[i] ? <><Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> Uploading…</> : <><FileText size={14} /> Attach document (PDF, JPG, PNG — max 5MB)</>}
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} disabled={!!plDocUploading[i]}
                                      onChange={async ev => {
                                        const file = ev.target.files?.[0]; if (!file) return
                                        setPlDocUploading(p => ({ ...p, [i]: true }))
                                        const fd = new FormData(); fd.append("file", file)
                                        const r = await fetch("/api/leave/upload-doc", { method: "POST", body: fd })
                                        const d = await r.json()
                                        setPlDocUploading(p => ({ ...p, [i]: false }))
                                        if (d.url) updatePL(i, "documentUrl", d.url)
                                        else setErrors(err => ({ ...err, [`plDoc_${i}`]: d.error ?? "Upload failed" }))
                                        ev.target.value = ""
                                      }} />
                                  </label>
                                )}
                                {errors[`plDoc_${i}`] && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>{errors[`plDoc_${i}`]}</div>}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Leave Description <span style={{ color: "var(--accent)" }}>*</span></label>
                        <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3}
                          placeholder="Brief reason for your leave…"
                          style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
                        {errors.reason && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>{errors.reason}</div>}
                      </div>

                      {selType?.requiresDoc && calcDays >= selType.minDocDays && (
                        <div>
                          <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--warning)", display: "flex", gap: 8, marginBottom: 10 }}>
                            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                            A supporting document is required for {selType.name} of {selType.minDocDays}+ days.
                          </div>
                          {form.documentUrl ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: 8, padding: "10px 14px" }}>
                              <Check size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: "var(--success)", flex: 1, fontWeight: 600 }}>Document uploaded</span>
                              <a href={form.documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--primary)", textDecoration: "underline" }}>View</a>
                              <button onClick={() => setForm(f => ({ ...f, documentUrl: "" }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0, display: "flex" }}><X size={13} /></button>
                            </div>
                          ) : (
                            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "2px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "var(--muted-foreground)" }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
                              {docUploading ? <><Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> Uploading…</> : <><FileText size={14} /> Attach document (PDF, JPG, PNG — max 5MB)</>}
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} disabled={docUploading}
                                onChange={async e => {
                                  const f = e.target.files?.[0]; if (!f) return
                                  setDocUploading(true)
                                  const fd = new FormData(); fd.append("file", f)
                                  const r = await fetch("/api/leave/upload-doc", { method: "POST", body: fd })
                                  const d = await r.json()
                                  setDocUploading(false)
                                  if (d.url) setForm(f => ({ ...f, documentUrl: d.url }))
                                  else setErrors(err => ({ ...err, doc: d.error ?? "Upload failed" }))
                                  e.target.value = ""
                                }} />
                            </label>
                          )}
                          {errors.doc && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>{errors.doc}</div>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Step 5: Review ── */}
                  {step === 5 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ background: "var(--muted)", borderRadius: 10, padding: 16 }}>
                        {[
                          ["Leave Type", selType?.name],
                          ["Duration", `${calcDays} working day${calcDays !== 1 ? "s" : ""}`],
                          ["Dates", form.startDate && form.endDate ? `${formatDate(form.startDate, "MMM d")} → ${formatDate(form.endDate, "MMM d")}` : "—"],
                          ["Project Lead(s)", form.projectLeads.map(pl => { const e = employees.find((x: any) => x.id === pl.employeeId); return e ? `${e.firstName} ${e.lastName}` : "—" }).join(", ") || "—"],
                          ...(form.documentUrl ? [["Supporting Document", "Attached ✓"]] : []),
                        ].map(([label, value]) => (
                          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
                            <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{value ?? "—"}</span>
                          </div>
                        ))}
                      </div>

                      {form.projectLeads.some(pl => pl.taskName) && (
                        <div style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8 }}>Handover Summary</div>
                          {form.projectLeads.map((pl, i) => {
                            const plEmp = employees.find((e: any) => e.id === pl.employeeId)
                            const reliefEmp = pl.relieverId ? employees.find((e: any) => e.id === pl.relieverId) : null
                            return (
                              <div key={i} style={{ fontSize: 12, paddingBottom: i < form.projectLeads.length - 1 ? 8 : 0, marginBottom: i < form.projectLeads.length - 1 ? 8 : 0, borderBottom: i < form.projectLeads.length - 1 ? "1px solid var(--border)" : "none" }}>
                                <div style={{ fontWeight: 700 }}>{plEmp ? `${plEmp.firstName} ${plEmp.lastName}` : "—"} — <span style={{ color: "var(--primary)" }}>{pl.taskName}</span></div>
                                {reliefEmp && <div style={{ color: "var(--muted-foreground)", marginTop: 2 }}>Relief: {reliefEmp.firstName} {reliefEmp.lastName}</div>}
                                {pl.taskDescription && <div style={{ color: "var(--muted-foreground)", marginTop: 2, fontStyle: "italic" }}>{pl.taskDescription.slice(0, 80)}{pl.taskDescription.length > 80 ? "…" : ""}</div>}
                                {pl.documentUrl && <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}><FileText size={11} style={{ color: "var(--success)" }} /><a href={pl.documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--primary)", textDecoration: "underline" }}>Handover document</a></div>}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {form.reason && (
                        <div style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>Description</div>
                          <div style={{ fontSize: 13 }}>{form.reason}</div>
                        </div>
                      )}

                      {errors.submit && (
                        <div style={{ fontSize: 13, color: "var(--accent)", background: "var(--danger-bg)", borderRadius: 8, padding: "10px 12px" }}>{errors.submit}</div>
                      )}
                    </div>
                  )}

                  {/* ── Step nav buttons ── */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                    <Button variant="secondary" onClick={prev} disabled={step === 1}>
                      ← Back
                    </Button>
                    {step < 5 ? (
                      <Button onClick={next}>Next →</Button>
                    ) : (
                      <Button onClick={submit} disabled={submitting}>
                        {submitting ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Submitting…</> : "Submit Request"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
