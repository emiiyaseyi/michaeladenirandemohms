"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import Link from "next/link"
import {
  Building2, UserCheck, Users, CalendarDays, Clock,
  Briefcase, Mail, Phone, MapPin, Banknote, Heart,
  Edit2, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react"
import { roleLabel } from "@/lib/rbac"

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
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/self-service/profile")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
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
    <div style={{ maxWidth:840, margin:"0 auto", display:"flex", flexDirection:"column", gap:20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Page header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800 }}>My Profile</h1>
          <p style={{ fontSize:13, color:"var(--muted-foreground)", marginTop:2 }}>Your personal information and employment details</p>
        </div>
        <Link href="/self-service/edit" style={{
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
              <Link href="/self-service/edit" style={{ fontSize:10, color:"var(--primary)", textDecoration:"none", fontWeight:600 }}>
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
            <InfoRow icon={Users}        label="Dept. Lead"      value={profile.departmentLead?.name} />
            <InfoRow icon={CalendarDays} label="Work Anniversary" value={profile.workAnniversary} />
          </div>
        </Card>

        {/* Leave balances */}
        <Card>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Leave Balances</div>
            <Link href="/self-service/leave" style={{ fontSize:12, color:"var(--primary)", fontWeight:600, textDecoration:"none" }}>
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
          <Link href="/self-service/edit" style={{ fontSize:12, color:"var(--primary)", fontWeight:600, textDecoration:"none" }}>Edit →</Link>
        </div>
        <div style={{ padding:"4px 18px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
          <InfoRow icon={Mail}    label="Work Email"    value={profile.email} />
          <InfoRow icon={Phone}   label="Phone"         value={profile.phone} />
          <InfoRow icon={MapPin}  label="City / State"  value={profile.city ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}` : undefined} />
          <InfoRow icon={Heart}   label="Marital Status" value={profile.maritalStatus} />
          <InfoRow icon={Banknote} label="Bank"         value={profile.bankName} />
        </div>
      </Card>

      {/* Active projects */}
      {profile.activeProjects?.length > 0 && (
        <Card>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Active Projects</div>
          </div>
          <div style={{ padding:"8px 18px 12px" }}>
            {profile.activeProjects.map((p: any) => (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderTop:"1px solid var(--border)" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#10B981", flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:600 }}>{p.name}</span>
                {p.role && <span style={{ fontSize:11, color:"var(--muted-foreground)" }}>· {p.role}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
