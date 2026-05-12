"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import EmptyState from "@/components/ui/EmptyState"
import {
  CalendarDays, Plus, Check, X, Clock, ChevronRight, ChevronLeft,
  AlertCircle, Users, Loader2, Info, Eye, Search, Trash2, Edit3,
  CalendarCheck, ArrowLeft, ShieldCheck, MessageSquare, Bell,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { addBusinessDays, format, parseISO, isWeekend, eachDayOfInterval } from "date-fns"

// ── Helpers ───────────────────────────────────────────────────────────────────

function CountdownTimer({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState("")
  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) { setRemaining("Overdue"); return }
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
      setRemaining(`${h}h ${m}m`)
    }
    tick(); const id = setInterval(tick, 60000); return () => clearInterval(id)
  }, [deadline])
  const urgent = new Date(deadline).getTime() - Date.now() < 2 * 3600000
  return <span style={{ fontSize: 11, fontWeight: 700, color: urgent ? "var(--accent)" : "var(--warning)", display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} />{remaining}</span>
}

function BalanceCard({ lb }: { lb: any }) {
  const pct = lb.allocated > 0 ? Math.min(100, (lb.remaining / lb.allocated) * 100) : 0
  const color = pct > 50 ? "var(--success)" : pct > 20 ? "var(--warning)" : "var(--accent)"
  return (
    <div style={{ background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", marginBottom: 6 }}>{lb.name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 900, color }}>{lb.remaining}</span>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/ {lb.allocated} days</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width .4s" }} />
      </div>
      <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4 }}>{lb.used} used{lb.pending > 0 ? ` · ${lb.pending} pending` : ""}</div>
    </div>
  )
}

function StageBar({ approvals }: { approvals: any[] }) {
  const STAGE_ORDER = ["PROJECT_LEAD", "HR_ADMIN"]
  const labels: Record<string, string> = { PROJECT_LEAD: "Project Lead", HR_ADMIN: "HR/Admin" }
  const stages = STAGE_ORDER.filter(s => approvals.some(a => a.stage === s))
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {stages.map((s, i) => {
        const stageApprovals = approvals.filter(x => x.stage === s)
        const done = stageApprovals.every(a => a.action && ["APPROVED", "APPROVED_WITH_COMMENT"].includes(a.action))
        const rej = stageApprovals.some(a => a.action === "REJECTED")
        const pend = stageApprovals.some(a => !a.action) && !rej
        return (
          <div key={`${s}-${i}`} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", borderColor: rej ? "var(--accent)" : done ? "var(--success)" : pend ? "var(--warning)" : "var(--border)", background: rej ? "var(--danger-bg)" : done ? "var(--success-bg)" : pend ? "var(--warning-bg)" : "var(--muted)" }}>
                {done ? <Check size={10} style={{ color: "var(--success)" }} /> : rej ? <X size={10} style={{ color: "var(--accent)" }} /> : pend ? <Clock size={10} style={{ color: "var(--warning)" }} /> : <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--border)" }} />}
              </div>
              <span style={{ fontSize: 9, color: "var(--muted-foreground)", whiteSpace: "nowrap", fontWeight: 600 }}>{labels[s]}</span>
            </div>
            {i < stages.length - 1 && <div style={{ width: 14, height: 2, background: done ? "var(--success)" : "var(--border)", margin: "0 0 14px" }} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Relief officer search ────────────────────────────────────────────────────

function ReliefOfficerSearch({ employees, selected, onChange }: { employees: any[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)


  
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = employees.filter(e =>
    !selected.includes(e.id) &&
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(query.toLowerCase())
  )
  const selectedEmps = employees.filter(e => selected.includes(e.id))

  const add = (id: string) => { onChange([...selected, id]); setQuery(""); setOpen(false) }
  const remove = (id: string) => onChange(selected.filter(x => x !== id))

  return (
    <div>
      {/* Selected chips */}
      {selectedEmps.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {selectedEmps.map(e => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--primary-50)", border: "1px solid var(--primary)", borderRadius: 20, padding: "4px 10px 4px 6px" }}>
              <Avatar name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto} size={22} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>{e.firstName} {e.lastName}</span>
              <button onClick={() => remove(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", display: "flex", padding: 0, lineHeight: 1 }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Search box */}
      <div ref={ref} style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", background: "var(--background)" }}>
          <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
            placeholder="Search employees by name…"
            style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, color: "var(--foreground)" }} />
        </div>
        {open && filtered.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-lg)", zIndex: 50, maxHeight: 220, overflowY: "auto", marginTop: 4 }}>
            {filtered.slice(0, 8).map(e => (
              <button key={e.id} onClick={() => add(e.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background .1s" }}
                onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                <Avatar name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto} size={30} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.firstName} {e.lastName}</div>
                  {e.jobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.jobTitle}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Apply Form (multi-step) ───────────────────────────────────────────────────

type PLEntry = { employeeId: string; taskName: string; taskDescription: string; relieverId: string }

function ApplyLeaveModal({ open, onClose, leaveTypes, employees, projectLeadEmployees, balances, employeeGender, onSuccess, userCaps, isAdmin, currentUserEmployeeId, currentUserId }: {
  open: boolean; onClose: () => void; leaveTypes: any[]; employees: any[]; projectLeadEmployees: any[];
  balances: any[]; employeeGender?: string; onSuccess: () => void; userCaps: any; isAdmin: boolean; currentUserEmployeeId?: string; currentUserId?: string
}) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calcDays, setCalcDays] = useState(0)
  const [holidays, setHolidays] = useState<any[]>([])
  const [docUploading, setDocUploading] = useState(false)
  const [plSearch, setPLSearch] = useState("")
  const [plDropOpen, setPLDropOpen] = useState(false)
  const [plDropRect, setPlDropRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const plSearchRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({ employeeId: "", leaveTypeId: "", startDate: "", endDate: "", reason: "", documentUrl: "", projectLeads: [] as PLEntry[] })

  const selType = leaveTypes.find(t => t.id === form.leaveTypeId)
  const selBal = balances.find(b => b.leaveTypeId === form.leaveTypeId)

  const visibleTypes = leaveTypes.filter(lt => {
    if (!lt.genderSpecific) return true
    const empGender = form.employeeId ? employees.find((e: any) => e.id === form.employeeId)?.gender : employeeGender
    if (!empGender) return true
    return lt.genderSpecific === empGender
  })

  const getMinDate = () => {
    if (!selType?.waitingDays || isAdmin) return format(new Date(), "yyyy-MM-dd")
    return format(addBusinessDays(new Date(), selType.waitingDays), "yyyy-MM-dd")
  }

  useEffect(() => {
    if (!form.startDate || !form.endDate || !form.leaveTypeId) { setCalcDays(0); return }
    fetch(`/api/leave/calculate-days?start=${form.startDate}&end=${form.endDate}&leaveTypeId=${form.leaveTypeId}`)
      .then(r => r.json()).then(d => { setCalcDays(d.days ?? 0); setHolidays(d.holidays ?? []) }).catch(() => {})
  }, [form.startDate, form.endDate, form.leaveTypeId])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!plSearchRef.current?.contains(e.target as Node)) setPLDropOpen(false) }
    const onResize = () => setPLDropOpen(false)
    document.addEventListener("mousedown", handler)
    window.addEventListener("resize", onResize)
    return () => {
      document.removeEventListener("mousedown", handler)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  const openPLDrop = () => {
    if (plSearchRef.current) {
      const r = plSearchRef.current.getBoundingClientRect()
      setPlDropRect({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setPLDropOpen(true)
  }

  const updatePL = (i: number, field: keyof PLEntry, value: string) => {
    setForm(f => { const pls = [...f.projectLeads]; pls[i] = { ...pls[i], [field]: value }; return { ...f, projectLeads: pls } })
    if (field === "taskName") setErrors(e => { const n = { ...e }; delete n[`taskName_${i}`]; return n })
  }
  const removePL = (i: number) => setForm(f => ({ ...f, projectLeads: f.projectLeads.filter((_, idx) => idx !== i) }))
  const addPL = (empId: string) => {
    if (form.projectLeads.some(p => p.employeeId === empId)) return
    setForm(f => ({ ...f, projectLeads: [...f.projectLeads, { employeeId: empId, taskName: "", taskDescription: "", relieverId: "" }] }))
    setErrors(e => { const n = { ...e }; delete n.pl; return n })
    setPLSearch(""); setPLDropOpen(false)
  }

  const applicantId = form.employeeId || currentUserEmployeeId
  const selectedPLIds = form.projectLeads.map(p => p.employeeId)
  const filteredPLs = projectLeadEmployees.filter((e: any) =>
    e.id !== applicantId &&
    (currentUserId ? e.userId !== currentUserId : true) &&
    !selectedPLIds.includes(e.id) &&
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(plSearch.toLowerCase())
  )

  const fi = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" } as const

  const validate = () => {
    const e: Record<string, string> = {}
    if (step === 1 && !form.leaveTypeId) e.leaveTypeId = "Select a leave type"
    if (step === 2) {
      if (!form.startDate) e.startDate = "Required"
      if (!form.endDate) e.endDate = "Required"
      if (form.startDate && isWeekend(parseISO(form.startDate))) e.startDate = "Start date cannot be a weekend"
      if (form.endDate && isWeekend(parseISO(form.endDate))) e.endDate = "End date cannot be a weekend"
      if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = "End date must be after start date"
      if (form.startDate && form.endDate && !e.startDate && !e.endDate && calcDays === 0) e.endDate = "No working days in this range (all weekends or holidays)"
    }
    if (step === 3) {
      if (form.projectLeads.length === 0) e.pl = "At least one Project Lead is required"
      form.projectLeads.forEach((pl, i) => { if (!pl.taskName.trim()) e[`taskName_${i}`] = "Task name required" })
    }
    if (step === 4) {
      if (!form.reason.trim()) e.reason = "Required"
      if (selType?.requiresDoc && calcDays >= selType.minDocDays && !form.documentUrl) e.doc = "A supporting document is required"
    }
    setErrors(e); return Object.keys(e).length === 0
  }

  const next = () => { if (validate()) setStep(s => Math.min(5, s + 1)) }
  const prev = () => setStep(s => Math.max(1, s - 1))

  const reset = () => {
    setStep(1); setCalcDays(0); setHolidays([]); setErrors({}); setPLSearch(""); setPLDropOpen(false); setPlDropRect(null)
    setForm({ employeeId: "", leaveTypeId: "", startDate: "", endDate: "", reason: "", documentUrl: "", projectLeads: [] })
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    const body = { ...form, days: calcDays, bypassWaitingPeriod: isAdmin }
    const r = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSubmitting(false)
    if (r.ok) { onClose(); reset(); onSuccess() }
    else { const d = await r.json(); setErrors({ submit: d.error ?? "Submission failed" }) }
  }

  const steps = [{ n: 1, l: "Type" }, { n: 2, l: "Dates" }, { n: 3, l: "Lead(s)" }, { n: 4, l: "Handover" }, { n: 5, l: "Review" }]

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Apply for Leave" width={640}>
      {/* Step bar — sticky so it never scrolls away */}
      <div style={{ display: "flex", padding: "12px 20px 4px", gap: 0, position: "sticky", top: 0, background: "var(--card)", zIndex: 10 }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: step > s.n ? "var(--success)" : step === s.n ? "var(--primary)" : "var(--muted)", color: step >= s.n ? "white" : "var(--muted-foreground)", transition: "all .2s", flexShrink: 0 }}>
                {step > s.n ? <Check size={11} /> : s.n}
              </div>
              <span className="modal-step-label" style={{ fontSize: 10, fontWeight: 600, color: step === s.n ? "var(--primary)" : "var(--muted-foreground)", textAlign: "center", maxWidth: 56, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.l}</span>
            </div>
            {i < steps.length - 1 && <div className="modal-step-connector" style={{ flex: 1, height: 2, background: step > s.n ? "var(--success)" : "var(--border)", margin: "0 3px 14px", transition: "background .2s", minWidth: 8 }} />}
          </div>
        ))}
      </div>

      <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {/* Step 1: Leave type */}
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
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Select Leave Type <span style={{ color: "var(--accent)" }}>*</span></label>
              {visibleTypes.length === 0 && <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: 16, textAlign: "center" }}>No leave types available</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
                {visibleTypes.map(lt => {
                  const bal = balances.find(b => b.leaveTypeId === lt.id)
                  const exhausted = bal ? bal.remaining <= 0 : false
                  const sel = form.leaveTypeId === lt.id
                  return (
                    <button key={lt.id} disabled={exhausted} onClick={() => !exhausted && setForm(f => ({ ...f, leaveTypeId: lt.id }))}
                      style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${exhausted ? "var(--border)" : sel ? "var(--primary)" : "var(--border)"}`, background: exhausted ? "var(--muted)" : sel ? "var(--primary-50)" : "var(--background)", cursor: exhausted ? "not-allowed" : "pointer", textAlign: "left", transition: "all .15s", opacity: exhausted ? 0.6 : 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: exhausted ? "var(--muted-foreground)" : sel ? "var(--primary)" : "var(--foreground)" }}>{lt.name}</div>
                      {bal && <div style={{ fontSize: 11, color: exhausted ? "var(--accent)" : "var(--muted-foreground)", marginTop: 3, fontWeight: exhausted ? 700 : 400 }}>{exhausted ? "Balance exhausted" : `${bal.remaining} days remaining of ${lt.defaultDays}`}</div>}
                      {lt.waitingDays > 0 && !isAdmin && !exhausted && <div style={{ fontSize: 10, color: "var(--warning)", marginTop: 3 }}>⚠ {lt.waitingDays} working days notice required</div>}
                      {lt.genderSpecific && !exhausted && <div style={{ fontSize: 10, color: "var(--info)", marginTop: 2 }}>{lt.genderSpecific === "FEMALE" ? "Female staff only" : "Male staff only"}</div>}
                    </button>
                  )
                })}
              </div>
              {errors.leaveTypeId && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 6 }}>{errors.leaveTypeId}</div>}
            </div>
          </div>
        )}

        {/* Step 2: Dates */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {selBal && (
              <div style={{ background: "var(--primary-50)", border: "1px solid var(--primary)", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                <CalendarDays size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{selType?.name}</span>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>— {selBal.remaining} days available</span>
              </div>
            )}
            {selType?.waitingDays > 0 && !isAdmin && (
              <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--warning)", display: "flex", gap: 8 }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                This leave requires {selType.waitingDays} working days notice. The earliest start date is <strong style={{ marginLeft: 4 }}>{formatDate(getMinDate())}</strong>.
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
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Calculated duration (working days)</div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "var(--primary)" }}>{calcDays}</span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 4 }}>days</span>
                  {holidays.length > 0 && <div style={{ fontSize: 10, color: "var(--warning)", marginTop: 2 }}>{holidays.length} public holiday{holidays.length !== 1 ? "s" : ""} excluded</div>}
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

        {/* Step 3: Project Leads & Tasks */}
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
                    <input placeholder="What task or project are you handing over?" value={pl.taskName} onChange={e => updatePL(i, "taskName", e.target.value)} style={fi} />
                    {errors[`taskName_${i}`] && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>{errors[`taskName_${i}`]}</div>}
                  </div>
                </div>
              )
            })}

            <div ref={plSearchRef}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px dashed var(--border)", borderRadius: 8, padding: "9px 12px", background: "var(--background)" }}>
                <Plus size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <input value={plSearch} onChange={e => { setPLSearch(e.target.value); openPLDrop() }} onFocus={() => openPLDrop()}
                  placeholder={form.projectLeads.length === 0 ? "Add a Project Lead…" : "Add another Project Lead…"}
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, color: "var(--foreground)" }} />
              </div>
              {plDropOpen && filteredPLs.length > 0 && plDropRect && (
                <div style={{ position: "fixed", top: plDropRect.top, left: plDropRect.left, width: plDropRect.width, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 9999, maxHeight: 220, overflowY: "auto" }}>
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

        {/* Step 4: Handover & Details */}
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
                        {employees.filter((e: any) => {
                          if (applicantId && e.id === applicantId) return false
                          if (currentUserId && e.userId === currentUserId) return false
                          return true
                        }).map((e: any) => (
                          <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.jobTitle ? ` — ${e.jobTitle}` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Task Description <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)" }}>(optional)</span></label>
                      <textarea value={pl.taskDescription} onChange={e => updatePL(i, "taskDescription", e.target.value)} rows={2}
                        placeholder="Describe what the relief officer needs to know about this task…"
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
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
                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "2px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "var(--muted-foreground)", transition: "border-color .15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
                    {docUploading ? <><Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> Uploading…</> : <><Plus size={14} /> Attach document (PDF, JPG, PNG — max 5MB)</>}
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

        {/* Step 5: Review */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "var(--muted)", borderRadius: 10, padding: 16 }}>
              {[
                ["Leave Type", selType?.name],
                ["Duration", `${calcDays} working day${calcDays !== 1 ? "s" : ""}`],
                ["Dates", form.startDate && form.endDate ? `${formatDate(form.startDate)} → ${formatDate(form.endDate)}` : "—"],
                ["Project Lead(s)", form.projectLeads.map(pl => { const e = employees.find((x: any) => x.id === pl.employeeId); return e ? `${e.firstName} ${e.lastName}` : "—" }).join(", ") || "—"],
                ...(form.documentUrl ? [["Supporting Document", "Attached ✓"]] : []),
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
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
            {errors.submit && <div style={{ fontSize: 13, color: "var(--accent)", background: "var(--danger-bg)", borderRadius: 8, padding: "10px 12px" }}>{errors.submit}</div>}
          </div>
        )}
      </div>

      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", position: "sticky", bottom: 0, background: "var(--card)", zIndex: 10, flexShrink: 0 }}>
        <Button variant="secondary" onClick={step === 1 ? () => { onClose(); reset() } : prev}>{step === 1 ? "Cancel" : <><ChevronLeft size={13} /> Back</>}</Button>
        {step < 5
          ? <Button onClick={next}>Next <ChevronRight size={13} /></Button>
          : <Button onClick={submit} disabled={submitting}>{submitting ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Submitting…</> : "Submit Request"}</Button>
        }
      </div>
    </Modal>
  )
}

// ── Leave Detail Popup ────────────────────────────────────────────────────────

function LeaveDetailModal({ req, onClose, isAdmin, currentUserEmployeeId }: { req: any; onClose: () => void; isAdmin?: boolean; currentUserEmployeeId?: string }) {
  const [nudging, setNudging] = useState<string | null>(null)
  const [nudged, setNudged] = useState<Record<string, boolean>>({})

  const nudgeStage = async (stage: string) => {
    setNudging(stage)
    try {
      const r = await fetch(`/api/leave/${req.id}/nudge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      })
      if (r.ok) setNudged(prev => ({ ...prev, [stage]: true }))
    } finally {
      setNudging(null)
    }
  }

  if (!req) return null
  return (
    <Modal open onClose={onClose} title="Leave Request Details" width={580}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Employee header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--muted)", borderRadius: 10 }}>
          <Avatar name={`${req.employee?.firstName} ${req.employee?.lastName}`} photo={req.employee?.profilePhoto} size={48} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{req.employee?.firstName} {req.employee?.lastName}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{req.employee?.department?.name ?? "—"}</div>
          </div>
          <div style={{ marginLeft: "auto" }}><Badge status={req.currentStage ?? req.status} /></div>
        </div>

        {/* Key details */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 10 }}>
          {[
            { label: "Leave Type", value: req.leaveType?.name },
            { label: "Duration", value: `${req.days} day${req.days !== 1 ? "s" : ""}` },
            { label: "Period", value: `${formatDate(req.startDate, "MMM d")} → ${formatDate(req.endDate, "MMM d")}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{value ?? "—"}</div>
            </div>
          ))}
        </div>

        {/* Approval chain — Relief Officer → Project Lead → Admin */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 10 }}>Approval Progress</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* ── Project Lead ── */}
            {(() => {
              const plApprovals: any[] = req.approvals?.filter((x: any) => x.stage === "PROJECT_LEAD") ?? []
              const done = plApprovals.length > 0 && plApprovals.every((a: any) => a.action && ["APPROVED", "APPROVED_WITH_COMMENT"].includes(a.action))
              const rej  = plApprovals.some((a: any) => a.action === "REJECTED")
              const pending = plApprovals.length > 0 && plApprovals.some((a: any) => !a.action) && !rej
              const notReached = plApprovals.length === 0
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 12px", borderRadius: 8, background: rej ? "var(--danger-bg)" : done ? "var(--success-bg)" : pending ? "#FFFBEB" : "var(--muted)", opacity: notReached ? 0.5 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: rej ? "var(--accent)" : done ? "var(--success)" : pending ? "#F59E0B" : "var(--border)" }}>
                      {done ? <Check size={11} color="white" /> : rej ? <X size={11} color="white" /> : pending ? <Clock size={11} color="white" /> : <div style={{ width:7, height:7, borderRadius:"50%", background:"var(--muted-foreground)", opacity:0.4 }} />}
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Project Lead{plApprovals.length > 1 ? "s" : ""}</span>
                      {pending && <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>Awaiting action</span>}
                      {notReached && <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>Not yet reached</span>}
                    </div>
                    {pending && plApprovals[0]?.deadline && <CountdownTimer deadline={plApprovals.find((a: any) => !a.action)?.deadline} />}
                    {isAdmin && pending && (
                      <button onClick={() => nudgeStage("PROJECT_LEAD")} disabled={nudging === "PROJECT_LEAD" || nudged["PROJECT_LEAD"]}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--warning)", background: nudged["PROJECT_LEAD"] ? "var(--success-bg)" : "var(--warning-bg)", color: nudged["PROJECT_LEAD"] ? "var(--success)" : "var(--warning)", cursor: nudging === "PROJECT_LEAD" ? "wait" : "pointer", flexShrink: 0 }}>
                        <Bell size={10} />{nudged["PROJECT_LEAD"] ? "Sent!" : nudging === "PROJECT_LEAD" ? "…" : "Nudge"}
                      </button>
                    )}
                  </div>
                  {plApprovals.length > 0 && (
                    <div style={{ marginLeft: 32, display: "flex", flexDirection: "column", gap: 3 }}>
                      {plApprovals.map((a: any) => {
                        const approved = a.action && ["APPROVED","APPROVED_WITH_COMMENT"].includes(a.action)
                        const rejected = a.action === "REJECTED"
                        return (
                          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                            <div style={{ width: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: rejected ? "var(--accent)" : approved ? "var(--success)" : "#F59E0B" }}>
                              {approved ? <Check size={8} color="white" /> : rejected ? <X size={8} color="white" /> : <Clock size={8} color="white" />}
                            </div>
                            <span style={{ fontWeight: 600 }}>{a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : "—"}</span>
                            <span style={{ color: approved ? "var(--success)" : rejected ? "var(--accent)" : "#F59E0B", fontWeight: 700 }}>
                              {approved ? "Approved" : rejected ? "Rejected" : "Pending"}
                            </span>
                            {a.comment && <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>"{a.comment}"</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── HR Admin ── */}
            {(() => {
              const hrApprovals: any[] = req.approvals?.filter((x: any) => x.stage === "HR_ADMIN") ?? []
              const a = hrApprovals[0]
              const done = !!a?.action && ["APPROVED", "APPROVED_WITH_COMMENT"].includes(a.action)
              const rej  = !!a?.action && a.action === "REJECTED"
              const pending = hrApprovals.length > 0 && !a?.action
              const notReached = hrApprovals.length === 0
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 12px", borderRadius: 8, background: rej ? "var(--danger-bg)" : done ? "var(--success-bg)" : pending ? "#FFFBEB" : "var(--muted)", opacity: notReached ? 0.5 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: rej ? "var(--accent)" : done ? "var(--success)" : pending ? "#F59E0B" : "var(--border)" }}>
                      {done ? <Check size={11} color="white" /> : rej ? <X size={11} color="white" /> : pending ? <Clock size={11} color="white" /> : <div style={{ width:7, height:7, borderRadius:"50%", background:"var(--muted-foreground)", opacity:0.4 }} />}
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>HR Admin</span>
                      {a?.employee && a?.action && (
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                          · {["APPROVED","APPROVED_WITH_COMMENT"].includes(a.action) ? "Approved by" : "Rejected by"} <strong>{a.employee.firstName} {a.employee.lastName}</strong>
                        </span>
                      )}
                      {pending && <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>Awaiting action</span>}
                      {notReached && <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>Not yet reached</span>}
                    </div>
                    {a?.action && <Badge status={a.action} />}
                    {isAdmin && pending && (
                      <button onClick={() => nudgeStage("HR_ADMIN")} disabled={nudging === "HR_ADMIN" || nudged["HR_ADMIN"]}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--warning)", background: nudged["HR_ADMIN"] ? "var(--success-bg)" : "var(--warning-bg)", color: nudged["HR_ADMIN"] ? "var(--success)" : "var(--warning)", cursor: nudging === "HR_ADMIN" ? "wait" : "pointer", flexShrink: 0 }}>
                        <Bell size={10} />{nudged["HR_ADMIN"] ? "Sent!" : nudging === "HR_ADMIN" ? "…" : "Nudge"}
                      </button>
                    )}
                  </div>
                  {a?.comment && <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic", marginLeft: 32 }}>"{a.comment}"</span>}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Reason & Notes */}
        {req.reason && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", marginBottom: 5 }}>Description</div>
            <div style={{ fontSize: 13, background: "var(--muted)", borderRadius: 8, padding: "10px 14px", lineHeight: 1.5 }}>{req.reason}</div>
          </div>
        )}
        {req.handoverNotes && (() => {
          let entries: any[] = []
          try { entries = JSON.parse(req.handoverNotes) } catch { return null }
          if (!Array.isArray(entries) || entries.length === 0) return null
          const isOwner = req.employeeId === currentUserEmployeeId
          const visibleEntries = isAdmin || isOwner
            ? entries
            : entries.filter((entry: any) => entry.projectLeadId === currentUserEmployeeId)
          if (visibleEntries.length === 0) return null
          return (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", marginBottom: 8 }}>Handover</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {visibleEntries.map((entry: any, i: number) => {
                  const plApproval = (req.approvals ?? []).find((a: any) => a.employeeId === entry.projectLeadId)
                  const plName = plApproval?.employee ? `${plApproval.employee.firstName} ${plApproval.employee.lastName}` : "Project Lead"
                  const reliefRecord = entry.relieverId ? (req.reliefOfficersList ?? []).find((r: any) => r.employeeId === entry.relieverId) : null
                  const reliefName = reliefRecord?.employee ? `${reliefRecord.employee.firstName} ${reliefRecord.employee.lastName}` : null
                  return (
                    <div key={i} style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: reliefName || entry.taskDescription ? 6 : 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{plName}</span>
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>→</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>{entry.taskName}</span>
                      </div>
                      {entry.taskDescription && (
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: reliefName ? 4 : 0 }}>{entry.taskDescription}</div>
                      )}
                      {reliefName && (
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Relief: <strong>{reliefName}</strong></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
        {req.documentUrl && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", marginBottom: 5 }}>Supporting Document</div>
            <a href={req.documentUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--primary)", fontWeight: 600, textDecoration: "none", background: "var(--primary-50)", padding: "7px 12px", borderRadius: 8 }}>
              View Document →
            </a>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "8px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Close</button>
      </div>
    </Modal>
  )
}

// ── PL Approve Modal ──────────────────────────────────────────────────────────

function PLApproveModal({ req, employees, currentUserEmployeeId, onClose, onDone }: {
  req: any; employees: any[]; currentUserEmployeeId?: string; onClose: () => void; onDone: () => void;
}) {
  const [handover, setHandover] = useState<any[]>(() => {
    try { return JSON.parse(req.handoverNotes ?? "[]") } catch { return [] }
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const myEntryIdx = handover.findIndex((e: any) => e.projectLeadId === currentUserEmployeeId)
  const myEntry = myEntryIdx >= 0 ? handover[myEntryIdx] : null
  const currentRelieverId = myEntry?.relieverId ?? ""

  const setRelief = (id: string) => {
    setError("")
    setHandover(prev => {
      const idx = prev.findIndex((e: any) => e.projectLeadId === currentUserEmployeeId)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = { ...next[idx], relieverId: id }; return next
      }
      return [...prev, { projectLeadId: currentUserEmployeeId, taskName: "", taskDescription: null, relieverId: id }]
    })
  }

  const submit = async () => {
    const entry = handover.find((e: any) => e.projectLeadId === currentUserEmployeeId)
    const relieverId = entry?.relieverId ?? ""
    if (!relieverId) { setError("Select a relief officer before approving."); return }
    setSubmitting(true); setError("")
    const patch = await fetch(`/api/leave/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoverNotes: handover.length > 0 ? JSON.stringify(handover) : null }),
    })
    if (!patch.ok) { const d = await patch.json(); setError(d.error ?? "Failed to save"); setSubmitting(false); return }
    await fetch(`/api/leave/${req.id}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVED" }),
    })
    setSubmitting(false); onDone(); onClose()
  }

  const meEmployee = currentUserEmployeeId ? employees.find((e: any) => e.id === currentUserEmployeeId) : null
  const otherOptions = employees.filter((e: any) => e.id !== req.employeeId && e.id !== currentUserEmployeeId)

  return (
    <Modal open onClose={onClose} title="Approve Leave Request" width={480}>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "var(--muted)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{req.employee?.firstName} {req.employee?.lastName}</div>
          {([["Leave Type", req.leaveType?.name], ["Period", `${formatDate(req.startDate, "MMM d")} → ${formatDate(req.endDate, "MMM d")}`], ["Duration", `${req.days} day${req.days !== 1 ? "s" : ""}`]] as [string, string][]).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          {/* Balance summary */}
          {req.employeeLeaveBalance && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 2, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted-foreground)" }}>Balance ({req.leaveType?.name})</span>
              <span style={{ fontWeight: 600, color: req.days > req.employeeLeaveBalance.remaining ? "var(--accent)" : "var(--foreground)" }}>
                {req.employeeLeaveBalance.remaining} / {req.employeeLeaveBalance.allocated} days remaining
              </span>
            </div>
          )}
          {req.reason && <div style={{ fontSize: 12, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 2 }}>{req.reason}</div>}
          {req.documentUrl && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 2 }}>
              <a href={req.documentUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
                <CalendarCheck size={12} /> View Supporting Document
              </a>
            </div>
          )}
        </div>
        {req.employeeLeaveBalance && req.days > req.employeeLeaveBalance.remaining && (
          <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--warning)", display: "flex", gap: 8, fontWeight: 600 }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            This request ({req.days}d) exceeds the employee's remaining balance ({req.employeeLeaveBalance.remaining}d). You may still approve — HR will see the shortfall.
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Relief Officer <span style={{ color: "var(--accent)" }}>*</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)", marginLeft: 6 }}>Required — can be yourself</span>
          </label>
          <select value={currentRelieverId} onChange={e => setRelief(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `1px solid ${error ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
            <option value="">Select relief officer…</option>
            {meEmployee && <option value={meEmployee.id}>Myself — {meEmployee.firstName} {meEmployee.lastName}</option>}
            {otherOptions.map((e: any) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.jobTitle ? ` — ${e.jobTitle}` : ""}</option>
            ))}
          </select>
          {error && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>{error}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={submitting || !currentRelieverId}>
            {submitting ? <><Loader2 size={12} style={{ animation: "spin .8s linear infinite" }} /> Approving…</> : <><Check size={12} /> Confirm Approval</>}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Edit Leave Modal ──────────────────────────────────────────────────────────

function EditLeaveModal({ req, onClose, onDone, isAdmin, isPLEdit = false, employees = [], currentUserEmployeeId }: {
  req: any; onClose: () => void; onDone: () => void; isAdmin: boolean; isPLEdit?: boolean; employees?: any[]; currentUserEmployeeId?: string;
}) {
  const [form, setForm] = useState({
    startDate: req.startDate ? req.startDate.split("T")[0] : "",
    endDate: req.endDate ? req.endDate.split("T")[0] : "",
    reason: req.reason ?? "",
  })
  const [handover, setHandover] = useState<any[]>(() => {
    try { return JSON.parse(req.handoverNotes ?? "[]") } catch { return [] }
  })
  const [reliefSearch, setReliefSearch] = useState("")
  const [reliefDropOpen, setReliefDropOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [calcDays, setCalcDays] = useState(req.days ?? 0)

  useEffect(() => {
    if (!form.startDate || !form.endDate || !req.leaveTypeId) return
    fetch(`/api/leave/calculate-days?start=${form.startDate}&end=${form.endDate}&leaveTypeId=${req.leaveTypeId}`)
      .then(r => r.json())
      .then(d => { if (d.days) setCalcDays(d.days) })
      .catch(() => {})
  }, [form.startDate, form.endDate, req.leaveTypeId])

  const anyReliefActed = (req.reliefOfficersList ?? []).some((r: any) => r.status !== "PENDING")
  const locked = anyReliefActed && !isAdmin && !isPLEdit

  // PL's own handover entry
  const myEntryIdx = isPLEdit ? handover.findIndex((e: any) => e.projectLeadId === currentUserEmployeeId) : -1
  const myEntry = myEntryIdx >= 0 ? handover[myEntryIdx] : null

  const setReliever = (employeeId: string) => {
    if (myEntryIdx < 0) return
    setHandover(prev => {
      const next = [...prev]
      next[myEntryIdx] = { ...next[myEntryIdx], relieverId: employeeId }
      return next
    })
    setReliefSearch(""); setReliefDropOpen(false)
  }
  const clearReliever = () => {
    if (myEntryIdx < 0) return
    setHandover(prev => { const next = [...prev]; next[myEntryIdx] = { ...next[myEntryIdx], relieverId: "" }; return next })
  }

  const currentRelieverId = myEntry?.relieverId ?? ""
  const currentReliever = currentRelieverId ? employees.find((e: any) => e.id === currentRelieverId) : null
  const currentRelieverIsMe = currentRelieverId === currentUserEmployeeId

  const meEmployee = currentUserEmployeeId ? employees.find((e: any) => e.id === currentUserEmployeeId) : null
  const meMatchesSearch = !reliefSearch || "me".includes(reliefSearch.toLowerCase()) ||
    (meEmployee && `${meEmployee.firstName} ${meEmployee.lastName}`.toLowerCase().includes(reliefSearch.toLowerCase()))

  const othersFiltered = employees.filter((e: any) =>
    e.id !== req.employeeId && e.id !== currentUserEmployeeId &&
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(reliefSearch.toLowerCase())
  )
  const filteredRelief: Array<any & { __isMe?: boolean }> = [
    ...(meEmployee && meMatchesSearch ? [{ ...meEmployee, __isMe: true }] : []),
    ...othersFiltered,
  ]

  const save = async () => {
    if (isPLEdit && myEntry && !currentRelieverId) {
      setError("You must assign a relief officer before saving."); return
    }
    setLoading(true); setError("")
    const body: any = { ...form }
    if (isPLEdit || isAdmin) body.handoverNotes = handover.length > 0 ? JSON.stringify(handover) : null
    const r = await fetch(`/api/leave/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed to save"); return }
    onDone(); onClose()
  }

  const fi = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" } as const

  return (
    <Modal open onClose={onClose} title={isPLEdit ? "Review Leave Request" : "Edit Leave Request"} width={560}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        {isPLEdit && (
          <div style={{ background: "var(--info-bg)", border: "1px solid var(--info)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--info)", display: "flex", gap: 8 }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            Review the leave dates and confirm or change who will cover your tasks. Relief officers are only notified after you approve.
          </div>
        )}
        {!isPLEdit && locked && (
          <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--warning)", display: "flex", gap: 8 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            A relief officer has already responded. This request is locked for editing. Contact HR/Admin for changes.
          </div>
        )}
        {!isPLEdit && isAdmin && anyReliefActed && (
          <div style={{ background: "var(--info-bg)", border: "1px solid var(--info)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--info)", display: "flex", gap: 8 }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            Admin override — relief officer has already responded but you can still make changes.
          </div>
        )}

        {/* Dates */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Start Date</label>
            <input type="date" disabled={locked} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...fi, opacity: locked ? 0.6 : 1 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>End Date</label>
            <input type="date" disabled={locked} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...fi, opacity: locked ? 0.6 : 1 }} />
          </div>
        </div>
        {calcDays > 0 && (
          <div style={{ background: "var(--muted)", borderRadius: 8, padding: "8px 14px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted-foreground)" }}>Working days</span>
            <strong>{calcDays} days</strong>
          </div>
        )}

        {/* PL: relief officer section */}
        {isPLEdit && myEntry && (
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Your Task Coverage</div>
            <div style={{ background: "var(--muted)", borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{myEntry.taskName}</div>
              {myEntry.taskDescription && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{myEntry.taskDescription}</div>}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Relief Officer <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}>(who will cover this task)</span></label>
              {currentReliever ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--primary-50)", border: "1px solid var(--primary)", borderRadius: 8, padding: "8px 12px" }}>
                  <Avatar name={`${currentReliever.firstName} ${currentReliever.lastName}`} photo={currentReliever.profilePhoto ?? undefined} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {currentRelieverIsMe ? "Me" : `${currentReliever.firstName} ${currentReliever.lastName}`}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {currentRelieverIsMe ? `${currentReliever.firstName} ${currentReliever.lastName} · You` : (currentReliever.jobTitle ?? "—")}
                    </div>
                  </div>
                  <button onClick={clearReliever} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4, display: "flex", borderRadius: 4 }} title="Remove">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px dashed var(--border)", borderRadius: 8, padding: "9px 12px", background: "var(--background)" }}>
                    <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <input
                      value={reliefSearch}
                      onChange={e => { setReliefSearch(e.target.value); setReliefDropOpen(true) }}
                      onFocus={() => setReliefDropOpen(true)}
                      placeholder="Search for a relief officer…"
                      style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, color: "var(--foreground)" }}
                    />
                  </div>
                  {reliefDropOpen && filteredRelief.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 180, overflowY: "auto", marginTop: 4 }}>
                      {filteredRelief.slice(0, 8).map((e: any) => (
                        <div key={e.id} onClick={() => setReliever(e.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-light, #f5f7fa)" }}
                          onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                          onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = ""}>
                          <Avatar name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto ?? undefined} size={26} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{e.__isMe ? "Me" : `${e.firstName} ${e.lastName}`}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                              {e.__isMe ? `${e.firstName} ${e.lastName}` : (e.jobTitle ?? "—")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5 }}>
                {currentReliever
                  ? currentRelieverIsMe
                    ? "You will cover this task yourself. You'll be notified once you approve."
                    : "This person will be notified once you approve the leave."
                  : "A relief officer is required — search above to assign someone."}
              </div>
            </div>
          </div>
        )}

        {/* Admin: reason field */}
        {!isPLEdit && (
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Reason</label>
            <textarea disabled={locked} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical", opacity: locked ? 0.6 : 1 }} />
          </div>
        )}

        {error && (
          <div style={{ background: "var(--danger-bg)", color: "var(--accent)", padding: "10px 14px", borderRadius: 8, fontSize: 13, display: "flex", gap: 8 }}>
            <AlertCircle size={14} />{error}
          </div>
        )}
      </div>
      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        {!locked && (
          <Button onClick={save} disabled={loading}>
            {loading ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Save Changes"}
          </Button>
        )}
      </div>
    </Modal>
  )
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const go = async () => {
    if (!comment.trim()) return
    setLoading(true)
    await fetch(`/api/leave/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "REJECTED", comment }) })
    setLoading(false); onDone(); onClose()
  }
  return (
    <Modal open={!!id} onClose={onClose} title="Reject Leave Request" width={440}>
      <div style={{ padding: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Reason <span style={{ color: "var(--accent)" }}>*</span></label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="Provide a reason for rejection…" style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
      </div>
      <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={go} disabled={!comment.trim() || loading}>{loading ? "…" : "Reject"}</Button>
      </div>
    </Modal>
  )
}

// ── Relief Duties Panel ───────────────────────────────────────────────────────

function ReliefDutiesPanel({ currentUserEmployeeId }: { currentUserEmployeeId?: string }) {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [declineModal, setDeclineModal] = useState<{ id: string } | null>(null)
  const [declineComment, setDeclineComment] = useState("")
  const [declineLoading, setDeclineLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/leave/relief")
    const d = await r.json()
    setAssignments(d.assignments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const respond = async (id: string, action: "ACCEPTED" | "DECLINED", comment?: string) => {
    setRespondingId(id)
    await fetch(`/api/leave/relief/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    })
    setRespondingId(null)
    load()
  }

  const statusColor: Record<string, string> = {
    PENDING: "var(--warning)",
    ACCEPTED: "var(--success)",
    DECLINED: "var(--accent)",
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}><Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…</div>
  }

  if (assignments.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No relief assignments" description="When someone adds you as a relief officer for their leave, it will appear here." />
  }

  const pending = assignments.filter(a => a.status === "PENDING")
  const past = assignments.filter(a => a.status !== "PENDING")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {pending.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 12 }}>
            Awaiting Your Response ({pending.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map((a: any) => {
              const req = a.leaveRequest
              const emp = req.employee
              const isResponding = respondingId === a.id
              return (
                <Card key={a.id} style={{ padding: 0, border: "2px solid var(--warning)", overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={42} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{emp.jobTitle} · {emp.department?.name}</div>
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontSize: 12, background: "var(--muted)", borderRadius: 6, padding: "3px 8px", fontWeight: 600 }}>{req.leaveType?.name}</span>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                            {formatDate(req.startDate, "MMM d")} → {formatDate(req.endDate, "MMM d")} · <strong>{req.days}</strong> days
                          </span>
                        </div>
                        {(() => {
                          if (!req.handoverNotes) return null
                          let entries: any[] = []
                          try { entries = JSON.parse(req.handoverNotes) } catch { return null }
                          const myEntries = entries.filter((e: any) => e.relieverId === currentUserEmployeeId)
                          if (myEntries.length === 0) return null
                          return (
                            <div style={{ marginTop: 8, background: "var(--muted)", borderRadius: 8, padding: "8px 12px", fontSize: 12, maxWidth: 420 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 4 }}>Your Task{myEntries.length > 1 ? "s" : ""}</div>
                              {myEntries.map((e: any, idx: number) => (
                                <div key={idx} style={idx > 0 ? { marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border)" } : {}}>
                                  <div style={{ fontWeight: 700 }}>{e.taskName}</div>
                                  {e.taskDescription && <div style={{ color: "var(--muted-foreground)", marginTop: 2 }}>{e.taskDescription}</div>}
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                        {req.documentUrl && (
                          <a href={req.documentUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 12, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
                            <CalendarCheck size={12} /> View Leave Document
                          </a>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        disabled={isResponding}
                        onClick={() => respond(a.id, "ACCEPTED")}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: "var(--success-bg)", color: "var(--success)", opacity: isResponding ? 0.6 : 1 }}
                      >
                        {isResponding ? <Loader2 size={12} style={{ animation: "spin .8s linear infinite" }} /> : <Check size={13} />} Accept
                      </button>
                      <button
                        disabled={isResponding}
                        onClick={() => { setDeclineModal({ id: a.id }); setDeclineComment("") }}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: "var(--danger-bg)", color: "var(--accent)", opacity: isResponding ? 0.6 : 1 }}
                      >
                        <X size={13} /> Decline
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "8px 20px", background: "rgba(234,179,8,0.06)", borderTop: "1px solid var(--warning)", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--warning)", fontWeight: 600 }}>
                    <Clock size={11} /> Respond within 12 hours of receiving this request
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 12 }}>
            Past Relief Duties ({past.length})
          </div>
          <Card style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Employee", "Leave Type", "Task", "Period", "Days", "Status", "Comment"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {past.map((a: any) => {
                  const req = a.leaveRequest
                  const emp = req.employee
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={28} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{emp.department?.name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13 }}>{req.leaveType?.name}</td>
                      <td style={{ padding: "11px 16px", fontSize: 12 }}>
                        {(() => {
                          if (!req.handoverNotes) return <span style={{ color: "var(--muted-foreground)" }}>—</span>
                          let entries: any[] = []
                          try { entries = JSON.parse(req.handoverNotes) } catch { return <span style={{ color: "var(--muted-foreground)" }}>—</span> }
                          const myEntries = entries.filter((e: any) => e.relieverId === currentUserEmployeeId)
                          if (myEntries.length === 0) return <span style={{ color: "var(--muted-foreground)" }}>—</span>
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {myEntries.map((e: any, idx: number) => (
                                <div key={idx}>
                                  <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{e.taskName}</div>
                                  {e.taskDescription && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{e.taskDescription}</div>}
                                </div>
                              ))}
                              {req.documentUrl && (
                                <a href={req.documentUrl} target="_blank" rel="noopener noreferrer"
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--primary)", textDecoration: "none", marginTop: 2 }}>
                                  <CalendarCheck size={10} /> View Document
                                </a>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{formatDate(req.startDate, "MMM d")} → {formatDate(req.endDate, "MMM d")}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700 }}>{req.days}d</td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: a.status === "ACCEPTED" ? "var(--success-bg)" : "var(--danger-bg)", color: statusColor[a.status] }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--muted-foreground)", maxWidth: 200 }}>{a.comment || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Decline Modal */}
      <Modal open={!!declineModal} onClose={() => setDeclineModal(null)} title="Decline Relief Request" width={420}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12 }}>
            Please provide a reason for declining. This will be visible to the leave applicant.
          </div>
          <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Reason <span style={{ color: "var(--accent)" }}>*</span></label>
          <textarea value={declineComment} onChange={e => setDeclineComment(e.target.value)} rows={3}
            placeholder="e.g. I'm unavailable during this period…"
            style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => setDeclineModal(null)}>Cancel</Button>
          <Button variant="danger" disabled={!declineComment.trim() || declineLoading} onClick={async () => {
            if (!declineModal) return
            setDeclineLoading(true)
            await respond(declineModal.id, "DECLINED", declineComment)
            setDeclineLoading(false)
            setDeclineModal(null)
          }}>
            {declineLoading ? <><Loader2 size={12} style={{ animation: "spin .8s linear infinite" }} /> Declining…</> : "Confirm Decline"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
type MainTab = Tab | "RELIEF"

export default function LeavePage() {
  const { user } = useCurrentUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [requests, setRequests] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [projectLeadEmployees, setProjectLeadEmployees] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [teamOnLeave, setTeamOnLeave] = useState<any[]>([])
  const [employeeGender, setEmployeeGender] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("ALL")
  const [mainTab, setMainTab] = useState<MainTab>("ALL")
  const [applyOpen, setApplyOpen] = useState(false)
  const [rejectId, setRejectId] = useState("")
  const [editLeave, setEditLeave] = useState<any | null>(null)
  const [viewLeave, setViewLeave] = useState<any | null>(null)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [sentNudges, setSentNudges] = useState<Set<string>>(new Set())
  const [approveTarget, setApproveTarget] = useState<{ id: string; stage?: string; req: any } | null>(null)
  const [approving, setApproving] = useState(false)
  const [plApproveTarget, setPLApproveTarget] = useState<any | null>(null)
  const [reviewReq, setReviewReq] = useState<any | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const canApprove = user?.role === "PROJECT_LEAD" || (user?.can("canApproveLeave") ?? false)
  const canSubmit = user?.caps?.canSubmitLeave
  const isInAdminPanel = pathname?.startsWith("/admin") ?? false
  const isAdmin = isInAdminPanel || user?.role === "SUPER_ADMIN" || (user?.can("canViewAllLeave") ?? false)
  const isSuperAdmin = user?.role === "SUPER_ADMIN"
  const isHRApprover = isAdmin && (user?.can("canApproveLeave") ?? false)
  const isPLApprover = user?.role === "PROJECT_LEAD" || (canApprove && !isHRApprover)
  const canCreateLeave = user?.can("canCreateLeave") ?? false
  const canEditLeave = user?.can("canEditLeave") ?? false
  const canDeleteLeave = user?.can("canDeleteLeave") ?? false

  // Sync mainTab from URL ?tab=relief
  useEffect(() => {
    const t = searchParams.get("tab")
    if (t === "relief") setMainTab("RELIEF")
  }, [searchParams])

  // Sync status tab from mainTab
  useEffect(() => {
    if (mainTab !== "RELIEF") setTab(mainTab as Tab)
  }, [mainTab])

  const load = useCallback(async () => {
    setLoading(true)
    const leaveRes = await fetch(`/api/leave?status=${tab === "ALL" ? "" : tab}`)
    const ld = await leaveRes.json()
    setRequests(ld.requests ?? [])
    setLeaveTypes(ld.leaveTypes ?? [])
    setEmployees(ld.employees ?? [])
    setProjectLeadEmployees(ld.projectLeadEmployees ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  // Profile & gender data — only for users with an employee account (avoid 404s for pure admins)
  const employeeId = user?.employeeId
  useEffect(() => {
    if (!employeeId) return
    fetch("/api/self-service/profile")
      .then(r => r.ok ? r.json() : null)
      .then(pd => { if (pd) { setBalances(pd.leaveBalances ?? []); setTeamOnLeave(pd.teamOnLeave ?? []) } })
      .catch(() => {})
    fetch("/api/self-service/employee-raw")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.employee?.gender) setEmployeeGender(d.employee.gender) })
      .catch(() => {})
  }, [employeeId])

  const approve = async (id: string, stage?: string) => {
    setApproving(true)
    await fetch(`/api/leave/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "APPROVED", stage }) })
    setApproving(false)
    setApproveTarget(null)
    load()
  }

  const nudge = async (id: string, stage: string) => {
    const key = `${id}:${stage}`
    await fetch(`/api/leave/${id}/nudge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) })
    setSentNudges(prev => new Set(prev).add(key))
    setTimeout(() => setSentNudges(prev => { const n = new Set(prev); n.delete(key); return n }), 2000)
  }

  const cancel = (id: string) => setCancelTargetId(id)

  const confirmCancel = async () => {
    if (!cancelTargetId) return
    await fetch(`/api/leave/${cancelTargetId}/cancel`, { method: "POST" })
    setCancelTargetId(null)
    load()
  }

  const statusTabs: Tab[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"]

  const filteredRequests = requests.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      `${r.employee?.firstName} ${r.employee?.lastName}`.toLowerCase().includes(q) ||
      r.leaveType?.name?.toLowerCase().includes(q) ||
      r.employee?.department?.name?.toLowerCase().includes(q)
    )
  })
  const pendingCount = requests.filter(r => {
    if (r.status !== "PENDING") return false
    if (isHRApprover && r.currentStage === "PENDING_HR_ADMIN") return true
    return r.approvals?.some((a: any) => a.employeeId === user?.employeeId && a.stage === "PROJECT_LEAD" && !a.action)
  }).length
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE))
  const pagedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Leave Management</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
            {isAdmin ? "Manage all leave requests across the organisation" : "Your leave requests and team availability"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {canCreateLeave && isInAdminPanel && (
            <button onClick={() => router.push("/admin/requests/leave/record")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
              <Plus size={13} /> Record Leave for an Employee
            </button>
          )}
          {canSubmit && !isInAdminPanel && (
            <button onClick={() => {
              const base = pathname?.startsWith("/project-lead") ? "/project-lead" : "/staff"
              router.push(`${base}/requests/leave/apply`)
            }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
              <Plus size={13} /> Apply for Leave
            </button>
          )}
        </div>
      </div>

      {/* Main navigation tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)" }}>
        {[
          { key: "ALL", label: "Requests" },
          { key: "RELIEF", label: "Relief Duties", icon: ShieldCheck },
        ].map(({ key, label, icon: Icon }) => {
          const activeActual = mainTab === key
          return (
            <button key={key} onClick={() => { setMainTab(key as MainTab); if (key !== "RELIEF") router.replace(pathname) }}
              style={{
                padding: "10px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: activeActual ? 700 : 500,
                background: "transparent", color: activeActual ? "var(--primary)" : "var(--muted-foreground)",
                borderBottom: `2px solid ${activeActual ? "var(--primary)" : "transparent"}`,
                marginBottom: -2, display: "flex", alignItems: "center", gap: 6, transition: "all .15s",
              }}>
              {Icon && <Icon size={14} />}{label}
            </button>
          )
        })}
      </div>

      {/* Relief Duties panel */}
      {mainTab === "RELIEF" && <ReliefDutiesPanel currentUserEmployeeId={user?.employeeId} />}

      {/* Leave content */}
      {mainTab !== "RELIEF" && !isAdmin && balances.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 10 }}>Your Leave Balances</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 10 }}>
            {balances.map(lb => <BalanceCard key={lb.leaveTypeId} lb={lb} />)}
          </div>
        </div>
      )}

      {/* Team on leave */}
      {mainTab !== "RELIEF" && teamOnLeave.length > 0 && (
        <Card>
          <div style={{ padding: "13px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}><Users size={14} style={{ color: "var(--primary)" }} /> Team Leave</div>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{teamOnLeave.length} away</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {teamOnLeave.map((m: any) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", minWidth: 200 }}>
                <Avatar name={m.name} photo={m.profilePhoto} size={30} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</div>
                  {m.currentLeave && <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{m.currentLeave.leaveType} · until {formatDate(m.currentLeave.endDate, "MMM d")}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Requests table */}
      {mainTab !== "RELIEF" && <Card>
        <div style={{ padding: "13px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 3, background: "var(--muted)", borderRadius: 7, padding: 3, flexShrink: 0 }}>
            {statusTabs.map(t => (
              <button key={t} onClick={() => { setTab(t); setPage(1) }} style={{ padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", transition: "all .15s" }}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search employee or leave type…"
              style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 220, outline: "none" }} />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 50, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : pagedRequests.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No leave requests" description={search ? "No requests match your search." : "No requests match this filter."} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Employee", "Leave Type", "Period", "Days", "Status", "Stage"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                  <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedRequests.map((req: any) => {
                  return (
                    <tr key={req.id}
                      onClick={() => setReviewReq(req)}
                      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={`${req.employee?.firstName} ${req.employee?.lastName}`} photo={req.employee?.profilePhoto} size={30} />
                          <div>
                            <div style={{ fontSize: 13 }}>
                              <span style={{ fontWeight: 800, textTransform: "uppercase" }}>{req.employee?.lastName}</span>{" "}{req.employee?.firstName}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{req.employee?.department?.name ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{req.leaveType?.name}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{formatDate(req.startDate, "MMM d")} → {formatDate(req.endDate, "MMM d")}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700 }}>{req.days}d</td>
                      <td style={{ padding: "12px 14px" }}><Badge status={req.currentStage ?? req.status} /></td>
                      <td style={{ padding: "12px 14px" }}>
                        {req.currentStage === "AWAITING_RELIEF" ? (
                          <div style={{ fontSize: 11, color: "var(--warning)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                            <Clock size={11} />
                            {(req.reliefOfficersList ?? []).filter((r: any) => r.status === "PENDING").length} pending
                          </div>
                        ) : req.approvals?.length > 0 ? (
                          <div>
                            <StageBar approvals={req.approvals} />
                            {req.status === "PENDING" && req.approvals?.find((a: any) => !a.action) && (
                              <div style={{ marginTop: 3 }}><CountdownTimer deadline={req.approvals.find((a: any) => !a.action)?.deadline} /></div>
                            )}
                          </div>
                        ) : <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <button onClick={e => { e.stopPropagation(); setReviewReq(req) }}
                          style={{ padding: "5px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap" }}>
                          Review
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredRequests.length > PAGE_SIZE && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length} requests
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12, opacity: page === 1 ? 0.5 : 1, display: "flex", alignItems: "center" }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return p <= totalPages ? (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: p === page ? "var(--primary)" : "var(--muted)", color: p === page ? "white" : "var(--foreground)", cursor: "pointer", fontSize: 12, fontWeight: p === page ? 700 : 400 }}>
                    {p}
                  </button>
                ) : null
              })}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 12, opacity: page === totalPages ? 0.5 : 1, display: "flex", alignItems: "center" }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>}

      {/* Review slide-in panel */}
      {reviewReq && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", zIndex: 40 }} onClick={() => setReviewReq(null)} />
          <div className="side-panel" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 520, background: "var(--card)", borderLeft: "1px solid var(--border)", zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", overflowY: "auto" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--card)", zIndex: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Leave Request</div>
              <button onClick={() => setReviewReq(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4, borderRadius: 6, display: "flex" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={`${reviewReq.employee?.firstName} ${reviewReq.employee?.lastName}`} photo={reviewReq.employee?.profilePhoto} size={44} />
                <div>
                  <div style={{ fontSize: 15 }}><span style={{ fontWeight: 800, textTransform: "uppercase" }}>{reviewReq.employee?.lastName}</span> {reviewReq.employee?.firstName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{reviewReq.employee?.department?.name ?? "—"}</div>
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
              {([
                ["Leave Type", reviewReq.leaveType?.name ?? "—"],
                ["Duration", `${reviewReq.days} day${reviewReq.days !== 1 ? "s" : ""}`],
                ["Start Date", formatDate(reviewReq.startDate, "MMM d, yyyy")],
                ["End Date", formatDate(reviewReq.endDate, "MMM d, yyyy")],
                ...(reviewReq.reason ? [["Reason", reviewReq.reason]] : []),
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>Status</span>
                <Badge status={reviewReq.currentStage ?? reviewReq.status} />
              </div>
            </div>
            {reviewReq.approvals?.length > 0 && (
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 10 }}>Approval Chain</div>
                <div style={{ marginBottom: 8 }}><StageBar approvals={reviewReq.approvals} /></div>
                {reviewReq.status === "PENDING" && reviewReq.approvals?.find((a: any) => !a.action) && (
                  <CountdownTimer deadline={reviewReq.approvals.find((a: any) => !a.action)?.deadline} />
                )}
              </div>
            )}
            {(reviewReq.reliefOfficersList ?? []).length > 0 && (
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 10 }}>Relief Officers</div>
                {(reviewReq.reliefOfficersList ?? []).map((r: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: i > 0 ? 8 : 0, paddingBottom: 8, borderBottom: i < reviewReq.reliefOfficersList.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : (r.name ?? r.relieverId)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: r.status === "ACCEPTED" ? "var(--success-bg)" : r.status === "DECLINED" ? "var(--danger-bg)" : "var(--warning-bg)", color: r.status === "ACCEPTED" ? "var(--success)" : r.status === "DECLINED" ? "var(--accent)" : "var(--warning)" }}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
            {reviewReq.documentUrl && (
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 8 }}>Supporting Document</div>
                <a href={reviewReq.documentUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--primary)", fontWeight: 600, textDecoration: "none", background: "var(--primary-50)", padding: "7px 12px", borderRadius: 8 }}>
                  <CalendarCheck size={13} /> View Document →
                </a>
              </div>
            )}
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", borderTop: "1px solid var(--border)" }}>
              <button onClick={() => { setViewLeave(reviewReq); setReviewReq(null) }}
                style={{ width: "100%", padding: "10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Eye size={14} /> View Full Details
              </button>
              {reviewReq.status === "PENDING" && isHRApprover && reviewReq.currentStage === "PENDING_PROJECT_LEAD" && (
                <button onClick={() => nudge(reviewReq.id, "PROJECT_LEAD")}
                  style={{ width: "100%", padding: "10px", background: sentNudges.has(`${reviewReq.id}:PROJECT_LEAD`) ? "var(--success-bg)" : "var(--warning-bg)", color: sentNudges.has(`${reviewReq.id}:PROJECT_LEAD`) ? "var(--success)" : "var(--warning)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Bell size={14} /> {sentNudges.has(`${reviewReq.id}:PROJECT_LEAD`) ? "Reminder Sent" : "Remind Project Lead"}
                </button>
              )}
              {reviewReq.status === "PENDING" && isHRApprover && reviewReq.currentStage === "PENDING_HR_ADMIN" && (<>
                <button onClick={() => { setApproveTarget({ id: reviewReq.id, stage: "HR_ADMIN", req: reviewReq }); setReviewReq(null) }}
                  style={{ width: "100%", padding: "10px", background: "var(--success-bg)", color: "var(--success)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Check size={14} /> Approve Leave
                </button>
                <button onClick={() => { setRejectId(reviewReq.id); setReviewReq(null) }}
                  style={{ width: "100%", padding: "10px", background: "var(--danger-bg)", color: "var(--accent)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <X size={14} /> Reject Leave
                </button>
              </>)}
              {reviewReq.status === "PENDING" && reviewReq.currentStage === "PENDING_PROJECT_LEAD" && reviewReq.approvals?.some((a: any) => a.employeeId === user?.employeeId && a.stage === "PROJECT_LEAD" && !a.action) && (<>
                <button onClick={() => { setPLApproveTarget(reviewReq); setReviewReq(null) }}
                  style={{ width: "100%", padding: "10px", background: "var(--success-bg)", color: "var(--success)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Check size={14} /> Approve
                </button>
                <button onClick={() => { setRejectId(reviewReq.id); setReviewReq(null) }}
                  style={{ width: "100%", padding: "10px", background: "var(--danger-bg)", color: "var(--accent)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <X size={14} /> Reject
                </button>
              </>)}
              {reviewReq.status === "PENDING" && reviewReq.currentStage === "PENDING_HR_ADMIN" && reviewReq.approvals?.some((a: any) => a.employeeId === user?.employeeId && a.stage === "PROJECT_LEAD") && (
                <button onClick={() => nudge(reviewReq.id, "HR_ADMIN")}
                  style={{ width: "100%", padding: "10px", background: sentNudges.has(`${reviewReq.id}:HR_ADMIN`) ? "var(--success-bg)" : "var(--warning-bg)", color: sentNudges.has(`${reviewReq.id}:HR_ADMIN`) ? "var(--success)" : "var(--warning)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Bell size={14} /> {sentNudges.has(`${reviewReq.id}:HR_ADMIN`) ? "Sent" : "Remind HR Admin"}
                </button>
              )}
              {canEditLeave && reviewReq.status === "PENDING" && (
                (reviewReq.employeeId === user?.employeeId && (isAdmin || !(reviewReq.reliefOfficersList ?? []).some((r: any) => r.status !== "PENDING"))) || isAdmin
              ) && (
                <button onClick={() => { setEditLeave(reviewReq); setReviewReq(null) }}
                  style={{ width: "100%", padding: "10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Edit3 size={14} /> Edit Request
                </button>
              )}
              {canDeleteLeave && reviewReq.status === "PENDING" && (reviewReq.employeeId === user?.employeeId || isAdmin) && (
                <button onClick={() => { cancel(reviewReq.id); setReviewReq(null) }}
                  style={{ width: "100%", padding: "10px", background: "var(--danger-bg)", color: "var(--accent)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Trash2 size={14} /> Cancel Request
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} leaveTypes={leaveTypes} employees={employees} projectLeadEmployees={projectLeadEmployees} balances={balances} employeeGender={employeeGender} onSuccess={load} userCaps={user?.caps} isAdmin={!!isAdmin} currentUserEmployeeId={user?.employeeId} currentUserId={user?.id} />
      {rejectId && <RejectModal id={rejectId} onClose={() => setRejectId("")} onDone={load} />}
      {editLeave && <EditLeaveModal req={editLeave} isAdmin={!!isAdmin} isPLEdit={editLeave?.currentStage === "PENDING_PROJECT_LEAD" && editLeave?.approvals?.some((a: any) => a.employeeId === user?.employeeId && a.stage === "PROJECT_LEAD" && !a.action)} onClose={() => setEditLeave(null)} onDone={load} employees={employees} currentUserEmployeeId={user?.employeeId} />}
      {plApproveTarget && <PLApproveModal req={plApproveTarget} employees={employees} currentUserEmployeeId={user?.employeeId} onClose={() => setPLApproveTarget(null)} onDone={load} />}
      {viewLeave && <LeaveDetailModal req={viewLeave} onClose={() => setViewLeave(null)} isAdmin={!!isAdmin} currentUserEmployeeId={user?.employeeId} />}

      {/* Approve confirmation modal */}
      <Modal open={!!approveTarget} onClose={() => { if (!approving) setApproveTarget(null) }} title="Confirm Approval" width={420}>
        {approveTarget && (
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 16 }}>
              You are about to approve the leave request for{" "}
              <strong>{approveTarget.req.employee?.firstName} {approveTarget.req.employee?.lastName}</strong>.
            </p>
            <div style={{ background: "var(--muted)", borderRadius: 8, padding: "12px 14px", fontSize: 13, display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted-foreground)" }}>Leave Type</span>
                <span style={{ fontWeight: 600 }}>{approveTarget.req.leaveType?.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted-foreground)" }}>Period</span>
                <span style={{ fontWeight: 600 }}>{formatDate(approveTarget.req.startDate, "MMM d")} → {formatDate(approveTarget.req.endDate, "MMM d")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted-foreground)" }}>Duration</span>
                <span style={{ fontWeight: 600 }}>{approveTarget.req.days} day{approveTarget.req.days !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="secondary" size="sm" onClick={() => setApproveTarget(null)} disabled={approving}>Cancel</Button>
              <Button size="sm" onClick={() => approve(approveTarget.id, approveTarget.stage)} disabled={approving}>
                {approving ? <><Loader2 size={12} style={{ animation: "spin .8s linear infinite" }} /> Approving…</> : <><Check size={12} /> Confirm Approval</>}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel confirmation modal */}
      <Modal open={!!cancelTargetId} onClose={() => setCancelTargetId(null)} title="Cancel Leave Request" width={400}>
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24, lineHeight: 1.6 }}>
            Are you sure you want to cancel this leave request? This action cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" size="sm" onClick={() => setCancelTargetId(null)}>Keep Request</Button>
            <Button variant="danger" size="sm" onClick={confirmCancel}>Yes, Cancel</Button>
          </div>
        </div>
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
