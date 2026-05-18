"use client"
import { useState, useEffect, useRef } from "react"
import { Building, Globe, Loader2, CalendarCheck } from "lucide-react"
import Avatar from "@/components/ui/Avatar"
import Card from "@/components/ui/Card"
import { formatDate } from "@/lib/utils"

interface LeaveEntry {
  id: string
  name: string
  jobTitle?: string | null
  profilePhoto?: string | null
  currentLeave?: { leaveType: string; endDate: string | Date } | null
}

interface Props {
  deptOnLeave: LeaveEntry[]
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted-foreground)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CalendarCheck size={20} style={{ opacity: .5 }} />
      </div>
      <span style={{ fontSize: 13, textAlign: "center" }}>{message}</span>
    </div>
  )
}

export default function DeptOrgLeaveCard({ deptOnLeave }: Props) {
  const [view, setView] = useState<"dept" | "org">("dept")
  const [orgOnLeave, setOrgOnLeave] = useState<LeaveEntry[]>([])
  const [orgLoading, setOrgLoading] = useState(false)
  const orgFetched = useRef(false)

  useEffect(() => {
    if (view === "org" && !orgFetched.current) {
      orgFetched.current = true
      setOrgLoading(true)
      fetch("/api/employees")
        .then(r => r.json())
        .then(d => {
          const on: LeaveEntry[] = (d.employees ?? [])
            .filter((e: any) => e.employeeStatus === "ON_LEAVE")
            .map((e: any) => ({
              id: e.id,
              name: `${e.firstName} ${e.lastName}`,
              jobTitle: e.jobTitle,
              profilePhoto: e.profilePhoto,
              currentLeave: null,
            }))
          setOrgOnLeave(on)
          setOrgLoading(false)
        })
        .catch(() => setOrgLoading(false))
    }
  }, [view])

  const list = view === "dept" ? deptOnLeave : orgOnLeave

  return (
    <Card>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Who's On Leave</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
          background: list.length > 0 ? "#EC489918" : "var(--muted)",
          color: list.length > 0 ? "#EC4899" : "var(--muted-foreground)",
        }}>
          {view === "org" && orgLoading ? "…" : list.length} away
        </span>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 18px" }}>
        {([
          { key: "dept", label: "Department", icon: Building },
          { key: "org",  label: "Organisation", icon: Globe },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "9px 12px 8px", fontSize: 12, fontWeight: 700,
            color: view === t.key ? "var(--primary)" : "var(--muted-foreground)",
            borderTop: "none", borderLeft: "none", borderRight: "none",
            borderBottom: view === t.key ? "2px solid var(--primary)" : "2px solid transparent",
            background: "none", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap",
          }}>
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {view === "org" && orgLoading ? (
        <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
          <Loader2 size={18} style={{ animation: "spin .8s linear infinite", color: "var(--muted-foreground)" }} />
        </div>
      ) : !list.length ? (
        <EmptyState message={view === "dept" ? "All department members are present" : "Nobody in the organisation is currently on leave"} />
      ) : (
        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          {list.map((m, i) => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "11px 18px",
              borderBottom: i < list.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <Avatar name={m.name} photo={m.profilePhoto ?? undefined} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{m.jobTitle ?? "—"}</div>
              </div>
              {m.currentLeave && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0EA5E9", background: "#0EA5E918", borderRadius: 5, padding: "2px 8px", display: "inline-block" }}>
                    {m.currentLeave.leaveType}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>
                    Until {formatDate(m.currentLeave.endDate, "MMM d")}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </Card>
  )
}
