"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { MoreVertical, Inbox } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

type SurveyType = "GENERAL" | "CONFIRMATION" | "EXIT"
type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED"

interface Survey {
  id: string
  title: string
  type: SurveyType
  isAnonymous: boolean
  status: SurveyStatus
  createdAt: string
  _count: { questions: number; responses: number }
}

interface Template {
  id: string
  name: string
  description?: string
  type: SurveyType
  isDefault: boolean
  status: SurveyStatus
  createdAt: string
  _count: { questions: number }
}

const TYPE_LABELS: Record<SurveyType, string> = {
  GENERAL: "General",
  CONFIRMATION: "Confirmation",
  EXIT: "Exit",
}

const STATUS_COLORS: Record<SurveyStatus, { bg: string; color: string }> = {
  DRAFT:  { bg: "#F3F4F6", color: "#6B7280" },
  ACTIVE: { bg: "#D1FAE5", color: "#065F46" },
  CLOSED: { bg: "#FEE2E2", color: "#991B1B" },
}

function StatusBadge({ status }: { status: SurveyStatus }) {
  const s = STATUS_COLORS[status]
  return (
    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

function RowMenu({ onEdit, onDelete, canEdit, canDelete }: { onEdit: () => void; onDelete: () => void; canEdit: boolean; canDelete: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreVertical size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{
          position: "fixed", top: pos.top, right: pos.right,
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          zIndex: 9999, minWidth: 120, overflow: "hidden",
        }}>
          {[
            ...(canEdit ? [{ label: "Edit", action: () => { setOpen(false); onEdit() }, danger: false }] : []),
            ...(canDelete ? [{ label: "Delete", action: () => { setOpen(false); onDelete() }, danger: true }] : []),
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{
              display: "block", width: "100%", padding: "10px 16px",
              background: "none", border: "none", cursor: "pointer",
              textAlign: "left", fontSize: 13,
              color: item.danger ? "#EF4444" : "var(--foreground)",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

export default function SurveysPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const canCreateSurvey = user?.can("canCreateSurvey") ?? false
  const canEditSurvey = user?.can("canEditSurvey") ?? false
  const canDeleteSurvey = user?.can("canDeleteSurvey") ?? false
  const [tab, setTab] = useState<"surveys" | "templates">("surveys")
  const [templateTab, setTemplateTab] = useState<"custom" | "default">("custom")
  const [typeFilter, setTypeFilter] = useState<SurveyType | "">("")
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const typeRef = useRef<HTMLDivElement>(null)

  const [surveys, setSurveys] = useState<Survey[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSurveys = async () => {
    setLoading(true)
    try {
      const params = typeFilter ? `?type=${typeFilter}` : ""
      const res = await fetch(`/api/surveys${params}`)
      const data = await res.json()
      setSurveys(data.surveys ?? [])
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.set("type", typeFilter)
      params.set("isDefault", templateTab === "default" ? "true" : "false")
      const res = await fetch(`/api/surveys/templates?${params}`)
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === "surveys") fetchSurveys()
    else fetchTemplates()
  }, [tab, templateTab, typeFilter])

  useEffect(() => {
    if (!showTypeDropdown) return
    const handler = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setShowTypeDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showTypeDropdown])

  const [delDialog, setDelDialog] = useState<{ kind: "survey" | "template"; id: string } | null>(null)
  const [delBusy, setDelBusy] = useState(false)
  const deleteSurvey = (id: string) => setDelDialog({ kind: "survey", id })
  const deleteTemplate = (id: string) => setDelDialog({ kind: "template", id })
  const doDelete = async () => {
    if (!delDialog) return
    setDelBusy(true)
    const url = delDialog.kind === "survey" ? `/api/surveys/${delDialog.id}` : `/api/surveys/templates/${delDialog.id}`
    await fetch(url, { method: "DELETE" })
    setDelBusy(false); setDelDialog(null)
    if (delDialog.kind === "survey") fetchSurveys()
    else fetchTemplates()
  }

  const TYPES: Array<{ value: SurveyType; label: string }> = [
    { value: "GENERAL", label: "General" },
    { value: "CONFIRMATION", label: "Confirmation" },
    { value: "EXIT", label: "Exit" },
  ]

  return (
    <div>
      {/* Top tabs + action button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
          {(["surveys", "templates"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 20px", background: "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 600,
              color: tab === t ? "var(--primary)" : "var(--muted-foreground)",
              borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -1,
            }}>
              {t === "surveys" ? "Surveys" : "Templates"}
            </button>
          ))}
        </div>
        {canCreateSurvey && (
          <button
            onClick={() => tab === "surveys" ? router.push("/admin/surveys/new") : router.push("/admin/surveys/templates/new")}
            style={{ padding: "8px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {tab === "surveys" ? "Create Survey" : "Create Template"}
          </button>
        )}
      </div>

      {/* Surveys tab */}
      {tab === "surveys" && (
        <div>
          {/* Type filter */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <div ref={typeRef} style={{ position: "relative" }}>
              <button onClick={() => setShowTypeDropdown(v => !v)} style={{
                padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--card)", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, color: "var(--foreground)",
              }}>
                {typeFilter ? TYPE_LABELS[typeFilter] : "General"} <span style={{ fontSize: 10 }}>▼</span>
              </button>
              {showTypeDropdown && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 4,
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  zIndex: 100, minWidth: 140,
                }}>
                  {TYPES.map(t => (
                    <button key={t.value} onClick={() => { setTypeFilter(t.value); setShowTypeDropdown(false) }}
                      style={{
                        display: "block", width: "100%", padding: "10px 16px",
                        background: typeFilter === t.value ? "var(--muted)" : "none",
                        border: "none", cursor: "pointer", textAlign: "left", fontSize: 13,
                        color: "var(--foreground)",
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 48px", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>Description</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>Status</span>
              <span />
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
            ) : surveys.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center" }}>
                <Inbox size={36} strokeWidth={1} style={{ color: "#D1D5DB", display: "block", margin: "0 auto 12px" }} />
                <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No data</span>
              </div>
            ) : (
              surveys.map(s => (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 200px 48px", padding: "14px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {TYPE_LABELS[s.type]} · {s._count.questions} question{s._count.questions !== 1 ? "s" : ""} · {s._count.responses} response{s._count.responses !== 1 ? "s" : ""}
                      {s.isAnonymous && " · Anonymous"}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                  <RowMenu
                    onEdit={() => router.push(`/admin/surveys/${s.id}/edit`)}
                    onDelete={() => deleteSurvey(s.id)}
                    canEdit={canEditSurvey}
                    canDelete={canDeleteSurvey}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Templates tab */}
      {tab === "templates" && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          {/* Inner tabs + type filter */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
              {(["custom", "default"] as const).map(t => (
                <button key={t} onClick={() => setTemplateTab(t)} style={{
                  padding: "6px 16px", background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600,
                  color: templateTab === t ? "var(--primary)" : "var(--muted-foreground)",
                  borderBottom: templateTab === t ? "2px solid var(--primary)" : "2px solid transparent",
                  marginBottom: -1,
                }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div ref={typeRef} style={{ position: "relative" }}>
              <button onClick={() => setShowTypeDropdown(v => !v)} style={{
                padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--card)", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, color: "var(--foreground)",
              }}>
                {typeFilter ? TYPE_LABELS[typeFilter] : "General"} <span style={{ fontSize: 10 }}>▼</span>
              </button>
              {showTypeDropdown && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 4,
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  zIndex: 100, minWidth: 140,
                }}>
                  {TYPES.map(t => (
                    <button key={t.value} onClick={() => { setTypeFilter(t.value); setShowTypeDropdown(false) }}
                      style={{
                        display: "block", width: "100%", padding: "10px 16px",
                        background: typeFilter === t.value ? "var(--muted)" : "none",
                        border: "none", cursor: "pointer", textAlign: "left", fontSize: 13,
                        color: "var(--foreground)",
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 48px", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--muted)", borderRadius: "8px 8px 0 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>Title</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>Status</span>
              <span />
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
            ) : templates.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center" }}>
                <Inbox size={36} strokeWidth={1} style={{ color: "#D1D5DB", display: "block", margin: "0 auto 12px" }} />
                <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No data</span>
              </div>
            ) : (
              templates.map(t => (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 200px 48px", padding: "14px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {TYPE_LABELS[t.type]} · {t._count.questions} question{t._count.questions !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                  <RowMenu
                    onEdit={() => router.push(`/admin/surveys/templates/${t.id}/edit`)}
                    onDelete={() => deleteTemplate(t.id)}
                    canEdit={canEditSurvey}
                    canDelete={canDeleteSurvey}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!delDialog}
        onClose={() => setDelDialog(null)}
        onConfirm={doDelete}
        title={delDialog?.kind === "template" ? "Delete template?" : "Delete survey?"}
        body={delDialog?.kind === "template" ? "Delete this template? This cannot be undone." : "Delete this survey? All its responses will be removed too."}
        confirmText="Delete"
        variant="danger"
        loading={delBusy}
      />
    </div>
  )
}
