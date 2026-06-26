"use client"
import { useState, useEffect, useRef } from "react"
import Avatar from "@/components/ui/Avatar"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Link from "next/link"
import {
  Building2, UserCheck, CalendarDays, Clock, Edit2,
  ChevronRight, Cake, Loader2, AlertCircle,
  Users,
  Search, Briefcase, TrendingUp,
  Megaphone, ChevronLeft,
  Target, ClipboardList,
  Map, X, ArrowRight, ArrowLeft, Sparkles,
  LayoutDashboard, FolderOpen, Zap,
} from "lucide-react"
import { roleLabel } from "@/lib/rbac"
import DashboardAnnouncements from "@/components/layout/DashboardAnnouncements"
import CelebrationsCard from "@/components/shared/CelebrationsCard"
import DeptOrgLeaveCard from "@/components/shared/DeptOrgLeaveCard"

// ─── Keyframes injected once ─────────────────────────────────────────────────
const GLOBAL_STYLE = `
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes fadeInUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
`

// ─── Accent palette ──────────────────────────────────────────────────────────
const ACCENTS = ["#6366F1","#10B981","#F59E0B","#EC4899","#0EA5E9","#8B5CF6","#F97316"]
const leaveAccent = (i: number) => ACCENTS[i % ACCENTS.length]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SectionHeading({ title, action, actionHref }: { title: string; action?: string; actionHref?: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
      <span style={{ fontSize:13, fontWeight:700, color:"var(--foreground)" }}>{title}</span>
      {action && actionHref && (
        <Link href={actionHref} style={{ display:"flex", alignItems:"center", gap:3, fontSize:12, color:"var(--primary)", fontWeight:600, textDecoration:"none" }}>
          {action} <ChevronRight size={13} />
        </Link>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div style={{ padding:"32px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:10, color:"var(--muted-foreground)" }}>
      <div style={{ width:44, height:44, borderRadius:12, background:"var(--muted)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={20} style={{ opacity:.5 }} />
      </div>
      <span style={{ fontSize:13, textAlign:"center" }}>{message}</span>
    </div>
  )
}

// ─── Platform Tour ────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    icon: Sparkles,
    color: "#6366F1",
    title: "Welcome to DSN HRMS!",
    body: "This quick tour walks you through the key features of your employee dashboard. You can skip it at any time and restart it from your profile card.",
    wide: true,
  },
  {
    icon: LayoutDashboard,
    color: "#10B981",
    title: "Your Dashboard",
    body: "The hero card at the top shows your profile completeness, employment status, and how long you've been with the organisation. Keep your profile up to date so HR always has accurate info.",
    hint: "Look at the top of the page",
  },
  {
    icon: Zap,
    color: "#F59E0B",
    title: "Quick Actions",
    body: "The quick action bar lets you jump straight to common tasks - request leave, set KPI goals, take your appraisal, access your documents, and more. Scroll sideways if more actions exist.",
    hint: "Find it just below your hero card",
  },
  {
    icon: CalendarDays,
    color: "#EC4899",
    title: "Leave Balances",
    body: "Your leave balances show exactly how many days you have remaining for each leave type. The progress bars give a visual sense of usage. Pending requests are highlighted in amber.",
    hint: "Right side of the middle row",
  },
  {
    icon: Users,
    color: "#0EA5E9",
    title: "Who's On Leave",
    body: "This card shows colleagues currently on leave. Switch between your department and the whole organisation. A great way to coordinate cover before submitting your own leave request.",
    hint: "Left side of the lower row",
  },
  {
    icon: FolderOpen,
    color: "#8B5CF6",
    title: "Document Library",
    body: "HR uploads important company documents here - policies, SOPs, templates and more. Some documents require your acknowledgement. You'll see a reminder if any are outstanding.",
    hint: "Access via the sidebar → Documents",
  },
  {
    icon: UserCheck,
    color: "#10B981",
    title: "Self Service",
    body: "The Self Service section is your personal hub: update your profile, submit and track leave, and access your documents - all in one place.",
    hint: "Click 'Self Service' in the left sidebar",
  },
  {
    icon: Cake,
    color: "#F97316",
    title: "Celebrations",
    body: "Never miss a colleague's birthday or work anniversary! The celebrations card at the bottom tracks upcoming events in the next 60 days so you can send wishes or plan team events.",
    hint: "Scroll to the bottom of the dashboard",
  },
]

const TOUR_KEY = "dsn_hrms_tour_done_v1"

function PlatformTour({ forceOpen = false, onStart }: { forceOpen?: boolean; onStart: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceOpen) { setOpen(true); setStep(0); return }
    if (typeof window !== "undefined" && !localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(t)
    }
  }, [forceOpen])

  const close = () => {
    setOpen(false)
    localStorage.setItem(TOUR_KEY, "1")
  }

  const next = () => {
    if (step < TOUR_STEPS.length - 1) setStep(s => s + 1)
    else close()
  }

  const prev = () => setStep(s => s - 1)

  // Expose restart to parent
  useEffect(() => { onStart() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const current = TOUR_STEPS[step]
  const Icon = current.icon
  const isFirst = step === 0
  const isLast = step === TOUR_STEPS.length - 1

  if (!open) return null

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, backdropFilter: "blur(4px)",
      animation: "fadeInUp .25s ease",
    }}>
      <div style={{
        background: "var(--card)", borderRadius: 20,
        width: "100%", maxWidth: current.wide ? 480 : 440,
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        overflow: "hidden", position: "relative",
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: "var(--border)" }}>
          <div style={{
            height: "100%", background: current.color,
            width: `${((step + 1) / TOUR_STEPS.length) * 100}%`,
            transition: "width 0.3s ease",
          }} />
        </div>

        {/* Close */}
        <button onClick={close} style={{
          position: "absolute", top: 14, right: 14,
          background: "var(--muted)", border: "none", borderRadius: "50%",
          width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--muted-foreground)",
        }}><X size={14} /></button>

        <div style={{ padding: "28px 28px 24px" }}>
          {/* Icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16, marginBottom: 18,
            background: current.color + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={26} style={{ color: current.color }} />
          </div>

          {/* Step counter */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", marginBottom: 6 }}>
            Step {step + 1} of {TOUR_STEPS.length}
          </div>

          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--foreground)", marginBottom: 10, lineHeight: 1.25 }}>
            {current.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65, marginBottom: current.hint ? 16 : 0 }}>
            {current.body}
          </div>

          {current.hint && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7, marginTop: 12,
              background: current.color + "10", borderRadius: 8, padding: "8px 12px",
              border: `1px solid ${current.color}25`,
            }}>
              <Map size={12} style={{ color: current.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: current.color, fontWeight: 600 }}>{current.hint}</span>
            </div>
          )}
        </div>

        {/* Dot indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingBottom: 4 }}>
          {TOUR_STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 18 : 6, height: 6, borderRadius: 3,
              background: i === step ? current.color : "var(--border)",
              transition: "all 0.25s", cursor: "pointer",
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ padding: "14px 28px 22px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={close} style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: "transparent", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted-foreground)",
          }}>Skip tour</button>
          {!isFirst && (
            <button onClick={prev} style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer",
              color: "var(--foreground)", display: "flex", alignItems: "center", gap: 5,
            }}><ArrowLeft size={12} /> Back</button>
          )}
          <button onClick={next} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: current.color, border: "none", cursor: "pointer",
            color: "white", display: "flex", alignItems: "center", gap: 5,
          }}>
            {isLast ? "Done!" : <>{isFirst ? "Start tour" : "Next"} <ArrowRight size={12} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({ profile, onTakeTour }: { profile: any; onTakeTour: () => void }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div style={{
      borderRadius:16, overflow:"hidden", position:"relative",
      background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a4e 100%)",
      boxShadow:"0 8px 32px rgba(0,0,0,0.18)", animation:"fadeInUp .4s ease both",
    }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220, borderRadius:"50%", background:"rgba(99,102,241,0.15)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:-80, left:200, width:260, height:260, borderRadius:"50%", background:"rgba(16,185,129,0.08)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:20, right:300, width:120, height:120, borderRadius:"50%", background:"rgba(236,72,153,0.08)", pointerEvents:"none" }} />

      <div style={{ position:"relative", padding:"28px 32px", display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <div style={{ width:84, height:84, borderRadius:"50%", padding:3, background:"linear-gradient(135deg,#6366F1,#EC4899,#F59E0B)" }}>
            <div style={{ width:"100%", height:"100%", borderRadius:"50%", overflow:"hidden", background:"#1a1a2e" }}>
              <Avatar name={profile.fullName} photo={profile.profilePhoto} size={78} />
            </div>
          </div>
          <div style={{ position:"absolute", bottom:4, right:4, width:14, height:14, borderRadius:"50%", background:"#10B981", border:"2.5px solid #1a1a2e" }} />
        </div>

        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.5)", marginBottom:4 }}>{greeting}</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"white", margin:0, lineHeight:1.2 }}>{profile.fullName}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.7)", fontWeight:500 }}>{profile.jobTitle ?? roleLabel(profile.role)}</span>
            {profile.department && (
              <>
                <span style={{ color:"rgba(255,255,255,0.3)" }}>·</span>
                <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"rgba(255,255,255,0.6)" }}>
                  <Building2 size={11} /> {profile.department}
                </span>
              </>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, flexWrap:"wrap" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"#4ade80", background:"rgba(74,222,128,0.12)", borderRadius:6, padding:"3px 10px", border:"1px solid rgba(74,222,128,0.2)" }}>
              ID: {profile.employeeId}
            </span>
            <Badge status={profile.employeeStatus ?? "ACTIVE"} />
            {profile.timeInCompany && (
              <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"rgba(255,255,255,0.45)" }}>
                <Clock size={10} /> {profile.timeInCompany}
              </span>
            )}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
          {profile.completeness !== undefined && (
            <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:10, padding:"8px 14px", textAlign:"center", minWidth:80 }}>
              <div style={{ fontSize:20, fontWeight:900, color: profile.completeness >= 80 ? "#10B981" : profile.completeness >= 50 ? "#F59E0B" : "#EC4899" }}>
                {profile.completeness}%
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:1 }}>Profile</div>
            </div>
          )}
          <Link href="/staff/self-service/edit" style={{
            display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
            borderRadius:8, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
            color:"white", fontSize:12, fontWeight:600, textDecoration:"none",
          }}>
            <Edit2 size={12} /> Edit Profile
          </Link>
          <button onClick={onTakeTour} style={{
            display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
            borderRadius:8, background:"rgba(99,102,241,0.2)", border:"1px solid rgba(99,102,241,0.4)",
            color:"#a5b4fc", fontSize:12, fontWeight:600, cursor:"pointer",
          }}>
            <Map size={12} /> Take a tour
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label:"Request Leave",   href:"/staff/requests/leave",              color:"#6366F1", icon:CalendarDays },
  { label:"Set KPI Goals",   href:"/staff/performance/my",              color:"#F59E0B", icon:Target },
  { label:"Take Appraisal",  href:"/staff/performance/peer-reviews",    color:"#EC4899", icon:TrendingUp },
  { label:"My Documents",    href:"/staff/documents",                   color:"#8B5CF6", icon:ClipboardList },
]

function QuickActionsBar() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scroll = (dir: "l" | "r") => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === "l" ? -200 : 200, behavior:"smooth" })
  }
  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => scroll("l")} aria-label="Scroll left" style={{ position:"absolute", left:-12, top:"50%", transform:"translateY(-50%)", zIndex:2, width:28, height:28, borderRadius:"50%", border:"1px solid var(--border)", background:"var(--card)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
        <ChevronLeft size={14} style={{ color:"var(--muted-foreground)" }} />
      </button>
      <div ref={scrollRef} style={{ display:"flex", gap:10, overflowX:"auto", scrollbarWidth:"none", padding:"4px 2px" }}>
        {QUICK_ACTIONS.map(a => (
          <Link key={a.label} href={a.href} style={{
            display:"inline-flex", alignItems:"center", gap:8, padding:"9px 18px", borderRadius:999,
            background:`${a.color}14`, border:`1.5px solid ${a.color}30`,
            color:a.color, fontWeight:700, fontSize:13,
            textDecoration:"none", whiteSpace:"nowrap", flexShrink:0, transition:"all .15s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}28`; (e.currentTarget as HTMLElement).style.borderColor = a.color }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}14`; (e.currentTarget as HTMLElement).style.borderColor = `${a.color}30` }}
          >
            <a.icon size={14} />
            {a.label}
          </Link>
        ))}
      </div>
      <button onClick={() => scroll("r")} aria-label="Scroll right" style={{ position:"absolute", right:-12, top:"50%", transform:"translateY(-50%)", zIndex:2, width:28, height:28, borderRadius:"50%", border:"1px solid var(--border)", background:"var(--card)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
        <ChevronRight size={14} style={{ color:"var(--muted-foreground)" }} />
      </button>
    </div>
  )
}

// ─── Leave Balance Card (individual tile) ────────────────────────────────────
function LeaveBalanceCard({ lb, accent }: { lb: any; accent: string }) {
  const pct = lb.allocated > 0 ? Math.min(100, (lb.remaining / lb.allocated) * 100) : 0
  return (
    <div style={{
      borderRadius:12, padding:"14px", border:`1px solid ${accent}22`,
      background:`linear-gradient(135deg, ${accent}0A 0%, ${accent}05 100%)`,
      display:"flex", flexDirection:"column", gap:8, position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${accent}, ${accent}44)`, borderRadius:"12px 12px 0 0" }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--muted-foreground)", marginBottom:2 }}>{lb.name}</div>
          {lb.pending > 0 && (
            <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:4, background:"#F59E0B22", color:"#F59E0B", border:"1px solid #F59E0B33" }}>
              {lb.pending}d pending
            </span>
          )}
        </div>
        <div style={{ width:28, height:28, borderRadius:7, background:`${accent}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <CalendarDays size={12} style={{ color:accent }} />
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"baseline", gap:3 }}>
        <span style={{ fontSize:26, fontWeight:900, color:accent, lineHeight:1 }}>{lb.remaining}</span>
        <span style={{ fontSize:11, color:"var(--muted-foreground)", fontWeight:500 }}>/ {lb.allocated}d</span>
      </div>
      <div>
        <div style={{ height:4, borderRadius:3, background:"var(--border)", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:accent, borderRadius:3, transition:"width .5s ease" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          <span style={{ fontSize:10, color:"var(--muted-foreground)" }}>{lb.used} used</span>
          <span style={{ fontSize:10, color:accent, fontWeight:600 }}>{lb.remaining} left</span>
        </div>
      </div>
    </div>
  )
}

// ─── Leave Balances Card ──────────────────────────────────────────────────────
function LeaveBalancesCard({ leaveBalances }: { leaveBalances: any[] }) {
  if (!leaveBalances?.length) {
    return (
      <Card style={{ animation:"fadeInUp .4s ease .1s both" }}>
        <SectionHeading title="Leave Balances" action="Request leave" actionHref="/staff/requests/leave" />
        <EmptyState icon={CalendarDays} message="No leave balances configured" />
      </Card>
    )
  }
  return (
    <Card style={{ animation:"fadeInUp .4s ease .1s both" }}>
      <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700 }}>Leave Balances</div>
          <div style={{ fontSize:11, color:"var(--muted-foreground)", marginTop:1 }}>{leaveBalances.length} type{leaveBalances.length !== 1 ? "s" : ""}</div>
        </div>
        <Link href="/staff/requests/leave" style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"var(--primary)", fontWeight:600, textDecoration:"none" }}>
          Request leave <ChevronRight size={13} />
        </Link>
      </div>
      <div style={{ padding:14, display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:10 }}>
        {leaveBalances.map((lb: any, i: number) => (
          <LeaveBalanceCard key={lb.leaveTypeId} lb={lb} accent={leaveAccent(i)} />
        ))}
      </div>
    </Card>
  )
}

// ─── Profile Info Card ────────────────────────────────────────────────────────
function ProfileInfoCard({ profile }: { profile: any }) {
  const secondaryDepts = Array.isArray(profile.secondaryDepartments) && profile.secondaryDepartments.length > 0
    ? profile.secondaryDepartments.join(", ")
    : "None"
  const items = [
    { icon:Building2,    label:"Primary Department",   value:profile.department },
    { icon:Users,        label:"Project Lead",         value:profile.projectLead?.name },
    { icon:Building2,    label:"Secondary Departments", value: secondaryDepts },
    { icon:UserCheck,    label:"Manager",              value:profile.supervisor?.name },
    { icon:CalendarDays, label:"Work Anniversary",     value:profile.workAnniversary },
    { icon:Clock,        label:"Time in Company",      value:profile.timeInCompany },
    { icon:Briefcase,    label:"Role",                 value:(profile.jobTitle?.toLowerCase().includes("intern") ? "Intern" : profile.jobTitle?.toLowerCase().includes("associate") ? "Associate" : roleLabel(profile.role)) },
  ].filter(i => i.value)

  return (
    <Card style={{ animation:"fadeInUp .4s ease .1s both" }}>
      <SectionHeading title="My Profile" action="Edit" actionHref="/staff/self-service/edit" />
      <div style={{ padding:"12px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", marginBottom:4 }}>
          <Avatar name={profile.fullName} photo={profile.profilePhoto} size={48} />
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--foreground)" }}>{profile.fullName}</div>
            <div style={{ fontSize:12, color:"var(--muted-foreground)" }}>{profile.jobTitle ?? roleLabel(profile.role)}</div>
          </div>
        </div>
        {items.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderTop:"1px solid var(--border)" }}>
            <div style={{ width:30, height:30, borderRadius:8, background:"var(--muted)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <item.icon size={13} style={{ color:"var(--primary)" }} />
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--muted-foreground)" }}>{item.label}</div>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--foreground)" }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}


// ─── Announcements Card ───────────────────────────────────────────────────────
function AnnouncementsCard() {
  return (
    <Card style={{ animation:"fadeInUp .4s ease .2s both" }}>
      <SectionHeading title="Announcements" />
      <EmptyState icon={Megaphone} message="No recent announcements" />
    </Card>
  )
}

// ─── All Employees Mini List ──────────────────────────────────────────────────
function AllEmployeesMini() {
  const [employees, setEmployees] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/employees")
      .then(r => r.json())
      .then(d => { setEmployees(d.employees ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = employees
    .filter(e => !search || `${e.firstName} ${e.lastName} ${e.jobTitle ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5)

  return (
    <Card style={{ animation:"fadeInUp .4s ease .35s both" }}>
      <SectionHeading title="All Employees" action="View all" actionHref="/staff/people" />
      <div style={{ padding:"10px 18px 8px" }}>
        <div style={{ position:"relative" }}>
          <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--muted-foreground)" }} />
          <input
            type="text" placeholder="Search employees…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width:"100%", padding:"8px 10px 8px 30px", borderRadius:8, border:"1px solid var(--border)", background:"var(--muted)", color:"var(--foreground)", fontSize:12, outline:"none", boxSizing:"border-box" }}
          />
        </div>
      </div>
      {loading ? (
        <div style={{ padding:20, display:"flex", justifyContent:"center" }}>
          <Loader2 size={18} style={{ animation:"spin .8s linear infinite", color:"var(--muted-foreground)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} message="No employees found" />
      ) : (
        <div style={{ paddingBottom:8 }}>
          {filtered.map((emp: any) => (
            <div key={emp.id} style={{
              display:"flex", alignItems:"center", gap:10, padding:"9px 18px",
              borderTop:"1px solid var(--border)",
            }}>
              <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={32} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"var(--foreground)" }}>
                  {emp.firstName} {emp.lastName}
                </div>
                <div style={{ fontSize:11, color:"var(--muted-foreground)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {emp.jobTitle ?? emp.department?.name ?? "-"}
                </div>
              </div>
              <Badge status={emp.employeeStatus ?? "ACTIVE"} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourKey, setTourKey] = useState(0)

  useEffect(() => {
    fetch("/api/self-service/profile")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(() => { setError("Failed to load profile"); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400, gap:12, color:"var(--muted-foreground)" }}>
      <style>{GLOBAL_STYLE}</style>
      <Loader2 size={20} style={{ animation:"spin .8s linear infinite" }} />
      <span style={{ fontSize:14 }}>Loading your dashboard…</span>
    </div>
  )

  if (error || !data?.profile) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:60, textAlign:"center" }}>
      <style>{GLOBAL_STYLE}</style>
      <div style={{ width:64, height:64, borderRadius:"50%", background:"var(--muted)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <AlertCircle size={28} style={{ color:"var(--muted-foreground)" }} />
      </div>
      <div>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>No Employee Profile Found</div>
        <div style={{ fontSize:13, color:"var(--muted-foreground)" }}>
          {error ?? "Your account is not linked to an employee record. Contact HR to set up your profile."}
        </div>
      </div>
    </div>
  )

  const { profile, leaveBalances, teamOnLeave } = data

  const startTour = () => {
    if (typeof window !== "undefined") localStorage.removeItem(TOUR_KEY)
    setTourKey(k => k + 1)
    setTourOpen(true)
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <style>{GLOBAL_STYLE}</style>
      <DashboardAnnouncements />

      {/* Platform Tour - auto on first visit, or manually triggered */}
      <PlatformTour key={tourKey} forceOpen={tourOpen} onStart={() => setTourOpen(false)} />

      {/* 1. Hero */}
      <HeroCard profile={profile} onTakeTour={startTour} />

      {/* 2. Quick Actions */}
      <Card style={{ padding:"14px 20px", animation:"fadeInUp .4s ease .05s both" }}>
        <QuickActionsBar />
      </Card>

      {/* 3. My Profile card + Leave Balances side by side */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 380px), 1fr))", gap:20 }}>
        <ProfileInfoCard profile={profile} />
        <LeaveBalancesCard leaveBalances={leaveBalances} />
      </div>

      {/* 4. Dept/Org Leave toggle + Announcements */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 480px), 1fr))", gap:20 }}>
        <DeptOrgLeaveCard deptOnLeave={teamOnLeave} />
        <AnnouncementsCard />
      </div>

      {/* 5. Celebrations + All Employees */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 420px), 1fr))", gap:20 }}>
        <CelebrationsCard />
        <AllEmployeesMini />
      </div>
    </div>
  )
}
