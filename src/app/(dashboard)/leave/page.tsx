"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import EmptyState from "@/components/ui/EmptyState"
import {
  CalendarDays, Plus, Check, X, Clock, ChevronRight, ChevronLeft,
  AlertCircle, Users, Loader2, Info, Eye, Search, Trash2, Edit3,
  CalendarCheck, ArrowLeft,
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
  const stages = ["RELIEF_OFFICER", "TEAM_LEAD", "MANAGER", "ADMIN"]
  const labels: Record<string, string> = { RELIEF_OFFICER: "Relief", TEAM_LEAD: "Team Lead", MANAGER: "Manager", ADMIN: "HR/Admin" }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {stages.map((s, i) => {
        const a = approvals.find(x => x.stage === s)
        const done = a?.action && ["APPROVED", "APPROVED_WITH_COMMENT", "ACCEPTED"].includes(a.action)
        const rej = a?.action === "REJECTED"
        const pend = a && !a.action
        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", borderColor: rej ? "var(--accent)" : done ? "var(--success)" : pend ? "var(--warning)" : "var(--border)", background: rej ? "var(--danger-bg)" : done ? "var(--success-bg)" : pend ? "var(--warning-bg)" : "var(--muted)" }}>
                {done ? <Check size={10} style={{ color: "var(--success)" }} /> : rej ? <X size={10} style={{ color: "var(--accent)" }} /> : pend ? <Clock size={10} style={{ color: "var(--warning)" }} /> : <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--border)" }} />}
              </div>
              <span style={{ fontSize: 9, color: "var(--muted-foreground)", whiteSpace: "nowrap", fontWeight: 600 }}>{labels[s]}</span>
            </div>
            {i < stages.length - 1 && <div style={{ width: 18, height: 2, background: done ? "var(--success)" : "var(--border)", margin: "0 0 14px" }} />}
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

function ApplyLeaveModal({ open, onClose, leaveTypes, employees, balances, employeeGender, onSuccess, userCaps, isAdmin }: {
  open: boolean; onClose: () => void; leaveTypes: any[]; employees: any[];
  balances: any[]; employeeGender?: string; onSuccess: () => void; userCaps: any; isAdmin: boolean
}) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calcDays, setCalcDays] = useState(0)
  const [holidays, setHolidays] = useState<any[]>([])
  const [form, setForm] = useState({ employeeId: "", leaveTypeId: "", startDate: "", endDate: "", reason: "", handoverNotes: "", reliefOfficerIds: [] as string[] })

  const selType = leaveTypes.find(t => t.id === form.leaveTypeId)
  const selBal = balances.find(b => b.leaveTypeId === form.leaveTypeId)

  // Gender-filtered leave types
  const visibleTypes = leaveTypes.filter(lt => {
    if (!lt.genderSpecific) return true
    const empGender = form.employeeId
      ? employees.find(e => e.id === form.employeeId)?.gender
      : employeeGender
    if (!empGender) return true
    return lt.genderSpecific === empGender
  })

  // Minimum start date (notice period)
  const getMinDate = () => {
    if (!selType?.waitingDays || isAdmin) return format(new Date(), "yyyy-MM-dd")
    const min = addBusinessDays(new Date(), selType.waitingDays)
    return format(min, "yyyy-MM-dd")
  }

  useEffect(() => {
    if (!form.startDate || !form.endDate || !form.leaveTypeId) { setCalcDays(0); return }
    fetch(`/api/leave/calculate-days?start=${form.startDate}&end=${form.endDate}&leaveTypeId=${form.leaveTypeId}`)
      .then(r => r.json())
      .then(d => { setCalcDays(d.days ?? 0); setHolidays(d.holidays ?? []) })
      .catch(() => {})
  }, [form.startDate, form.endDate, form.leaveTypeId])

  const fi = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" } as const

  const validate = () => {
    const e: Record<string, string> = {}
    if (step === 1 && !form.leaveTypeId) e.leaveTypeId = "Select a leave type"
    if (step === 2) {
      if (!form.startDate) e.startDate = "Required"
      if (!form.endDate) e.endDate = "Required"
      if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = "End date must be after start date"
    }
    if (step === 3 && form.reliefOfficerIds.length === 0) e.relief = "At least one relief officer required"
    if (step === 4 && !form.reason.trim()) e.reason = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validate()) setStep(s => Math.min(5, s + 1)) }
  const prev = () => setStep(s => Math.max(1, s - 1))

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    const body = { ...form, days: calcDays, bypassWaitingPeriod: isAdmin }
    const r = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSubmitting(false)
    if (r.ok) {
      onClose(); setStep(1)
      setForm({ employeeId: "", leaveTypeId: "", startDate: "", endDate: "", reason: "", handoverNotes: "", reliefOfficerIds: [] })
      onSuccess()
    } else {
      const d = await r.json(); setErrors({ submit: d.error ?? "Submission failed" })
    }
  }

  const steps = [{ n: 1, l: "Leave Type" }, { n: 2, l: "Dates" }, { n: 3, l: "Relief Officer" }, { n: 4, l: "Details" }, { n: 5, l: "Review" }]

  return (
    <Modal open={open} onClose={onClose} title="Apply for Leave" width={640}>
      {/* Step bar */}
      <div style={{ display: "flex", padding: "14px 24px 0", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: step > s.n ? "var(--success)" : step === s.n ? "var(--primary)" : "var(--muted)", color: step >= s.n ? "white" : "var(--muted-foreground)", transition: "all .2s" }}>
                {step > s.n ? <Check size={12} /> : s.n}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: step === s.n ? "var(--primary)" : "var(--muted-foreground)", whiteSpace: "nowrap" }}>{s.l}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: step > s.n ? "var(--success)" : "var(--border)", margin: "0 4px 14px", transition: "background .2s" }} />}
          </div>
        ))}
      </div>

      <div style={{ padding: 24, minHeight: 300 }}>
        {/* Step 1: Leave type */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(userCaps?.canViewAllLeave || userCaps?.canViewTeamLeave) && (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Applying for</label>
                <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} style={fi}>
                  <option value="">Myself</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Select Leave Type <span style={{ color: "var(--accent)" }}>*</span></label>
              {visibleTypes.length === 0 && <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: 16, textAlign: "center" }}>No leave types available</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {visibleTypes.map(lt => {
                  const bal = balances.find(b => b.leaveTypeId === lt.id)
                  const sel = form.leaveTypeId === lt.id
                  return (
                    <button key={lt.id} onClick={() => setForm(f => ({ ...f, leaveTypeId: lt.id }))}
                      style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${sel ? "var(--primary)" : "var(--border)"}`, background: sel ? "var(--primary-50)" : "var(--background)", cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: sel ? "var(--primary)" : "var(--foreground)" }}>{lt.name}</div>
                      {bal && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3 }}>{bal.remaining} days remaining of {lt.defaultDays}</div>}
                      {lt.waitingDays > 0 && !isAdmin && <div style={{ fontSize: 10, color: "var(--warning)", marginTop: 3 }}>⚠ {lt.waitingDays} working days notice required</div>}
                      {lt.genderSpecific && <div style={{ fontSize: 10, color: "var(--info)", marginTop: 2 }}>{lt.genderSpecific === "FEMALE" ? "Female staff only" : "Male staff only"}</div>}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

        {/* Step 3: Relief officers */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--info-bg)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--info)", display: "flex", gap: 8 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              All selected relief officers must accept before your request proceeds to approval. They have 12 hours to respond.
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                Relief Officer(s) <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <ReliefOfficerSearch
                employees={employees.filter((e: any) => e.id !== form.employeeId)}
                selected={form.reliefOfficerIds}
                onChange={ids => setForm(f => ({ ...f, reliefOfficerIds: ids }))}
              />
              {errors.relief && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 6 }}>{errors.relief}</div>}
            </div>
            <div style={{ background: "var(--muted)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--muted-foreground)" }}>
              <strong style={{ color: "var(--foreground)" }}>Approval chain (auto-detected):</strong> Relief Officer(s) → Project Lead → Team Lead / Dept Lead → Manager → HR Admin
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Leave Description <span style={{ color: "var(--accent)" }}>*</span></label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Brief reason for your leave…" style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
              {errors.reason && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>{errors.reason}</div>}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Handover Notes <span style={{ color: "var(--accent)" }}>*</span>
                <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}> — to be shared with relief officer(s)</span>
              </label>
              <textarea value={form.handoverNotes} onChange={e => setForm(f => ({ ...f, handoverNotes: e.target.value }))} rows={4} placeholder="Describe your responsibilities, ongoing tasks, and what the relief officer needs to know…" style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
            </div>
            {selType?.requiresDoc && calcDays >= selType.minDocDays && (
              <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--warning)", display: "flex", gap: 8 }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                A medical/supporting document is required for {selType.name} ≥ {selType.minDocDays} days. Document upload will be available in a future update.
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
                ["Relief Officer(s)", `${form.reliefOfficerIds.length} selected`],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value ?? "—"}</span>
                </div>
              ))}
            </div>
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

      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
        <Button variant="secondary" onClick={step === 1 ? onClose : prev}>{step === 1 ? "Cancel" : <><ChevronLeft size={13} /> Back</>}</Button>
        {step < 5
          ? <Button onClick={next}>Next <ChevronRight size={13} /></Button>
          : <Button onClick={submit} disabled={submitting}>{submitting ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Submitting…</> : "Submit Request"}</Button>
        }
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

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"

export default function LeavePage() {
  const { user } = useCurrentUser()
  const [requests, setRequests] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [teamOnLeave, setTeamOnLeave] = useState<any[]>([])
  const [employeeGender, setEmployeeGender] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("ALL")
  const [applyOpen, setApplyOpen] = useState(false)
  const [rejectId, setRejectId] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const canApprove = user?.caps?.canApproveLeave
  const canSubmit = user?.caps?.canSubmitLeave
  const isAdmin = user?.caps?.canViewAllLeave

  const load = useCallback(async () => {
    setLoading(true)
    // Fetch leave data; profile fetch is best-effort (admins may not have employee profile)
    const [leaveRes] = await Promise.all([
      fetch(`/api/leave?status=${tab === "ALL" ? "" : tab}`),
    ])
    const ld = await leaveRes.json()
    setRequests(ld.requests ?? [])
    setLeaveTypes(ld.leaveTypes ?? [])
    setEmployees(ld.employees ?? [])

    // Profile & gender: best-effort, don't block main load
    fetch("/api/self-service/profile")
      .then(r => r.ok ? r.json() : null)
      .then(pd => {
        if (!pd) return
        setBalances(pd.leaveBalances ?? [])
        setTeamOnLeave(pd.teamOnLeave ?? [])
      })
      .catch(() => {})

    fetch("/api/self-service/employee-raw")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.employee?.gender) setEmployeeGender(d.employee.gender) })
      .catch(() => {})

    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    await fetch(`/api/leave/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "APPROVED" }) })
    load()
  }

  const cancel = async (id: string) => {
    if (!confirm("Cancel this leave request?")) return
    await fetch(`/api/leave/${id}/cancel`, { method: "POST" })
    load()
  }

  const tabs: Tab[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"]

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
        {canSubmit && <Button size="sm" onClick={() => setApplyOpen(true)}><Plus size={13} /> Apply for Leave</Button>}
      </div>

      {/* Balances */}
      {balances.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 10 }}>Your Leave Balances</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 10 }}>
            {balances.map(lb => <BalanceCard key={lb.leaveTypeId} lb={lb} />)}
          </div>
        </div>
      )}

      {/* Team on leave */}
      {teamOnLeave.length > 0 && (
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
      <Card>
        <div style={{ padding: "13px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{canApprove ? "Leave Requests" : "My Leave History"}</div>
          <div style={{ display: "flex", gap: 3, background: "var(--muted)", borderRadius: 7, padding: 3 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", transition: "all .15s" }}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 50, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : requests.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No leave requests" description="No requests match this filter." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Employee", "Leave Type", "Days", "Dates", "Status", "Approval", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((req: any) => (
                  <React.Fragment key={req.id}>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={`${req.employee?.firstName} ${req.employee?.lastName}`} photo={req.employee?.profilePhoto} size={30} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{req.employee?.firstName} {req.employee?.lastName}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{req.employee?.department?.name ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 13 }}>{req.leaveType?.name}</td>
                      <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700 }}>{req.days}d</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{formatDate(req.startDate, "MMM d")} → {formatDate(req.endDate, "MMM d")}</td>
                      <td style={{ padding: "11px 14px" }}><Badge status={req.status} /></td>
                      <td style={{ padding: "11px 14px" }}>
                        {req.approvals?.length > 0 && <StageBar approvals={req.approvals} />}
                        {req.status === "PENDING" && req.approvals?.find((a: any) => !a.action) && (
                          <div style={{ marginTop: 3 }}><CountdownTimer deadline={req.approvals.find((a: any) => !a.action)?.deadline} /></div>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {req.status === "PENDING" && canApprove && (
                            <>
                              <button onClick={() => approve(req.id)} style={{ background: "var(--success-bg)", color: "var(--success)", border: "none", cursor: "pointer", borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}><Check size={11} /> Approve</button>
                              <button onClick={() => setRejectId(req.id)} style={{ background: "var(--danger-bg)", color: "var(--accent)", border: "none", cursor: "pointer", borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}><X size={11} /> Reject</button>
                            </>
                          )}
                          {["PENDING", "APPROVED"].includes(req.status) && (req.employeeId === user?.employeeId || isAdmin) && (
                            <button onClick={() => cancel(req.id)} title="Cancel request" style={{ background: "var(--muted)", color: "var(--muted-foreground)", border: "none", cursor: "pointer", borderRadius: 6, padding: "4px 7px", display: "flex", alignItems: "center" }}>
                              <Trash2 size={12} />
                            </button>
                          )}
                          <button onClick={() => setExpandedId(expandedId === req.id ? null : req.id)} style={{ background: "var(--muted)", color: "var(--muted-foreground)", border: "none", cursor: "pointer", borderRadius: 6, padding: "4px 7px", display: "flex", alignItems: "center" }}>
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === req.id && (
                      <tr key={`${req.id}-detail`}>
                        <td colSpan={7} style={{ padding: "0 14px 14px", background: "var(--muted)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, paddingTop: 12 }}>
                            {req.reason && <div><div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>Description</div><div style={{ fontSize: 13 }}>{req.reason}</div></div>}
                            {req.handoverNotes && <div><div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>Handover Notes</div><div style={{ fontSize: 13 }}>{req.handoverNotes}</div></div>}
                            {req.approvals?.length > 0 && (
                              <div style={{ gridColumn: "1/-1" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>Approval History</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                  {req.approvals.map((a: any) => (
                                    <div key={a.id} style={{ display: "flex", gap: 10, fontSize: 12, alignItems: "center" }}>
                                      <Badge status={a.action ?? "PENDING"} />
                                      <span style={{ fontWeight: 600 }}>{a.stage.replace(/_/g, " ")}</span>
                                      {a.employee && <span style={{ color: "var(--muted-foreground)" }}>by {a.employee.firstName} {a.employee.lastName}</span>}
                                      {a.comment && <span style={{ color: "var(--muted-foreground)" }}>— "{a.comment}"</span>}
                                      {!a.action && <CountdownTimer deadline={a.deadline} />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} leaveTypes={leaveTypes} employees={employees} balances={balances} employeeGender={employeeGender} onSuccess={load} userCaps={user?.caps} isAdmin={!!isAdmin} />
      {rejectId && <RejectModal id={rejectId} onClose={() => setRejectId("")} onDone={load} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
