"use client"
import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Send, CheckCircle2, XCircle, Pencil, Trash2, Plus, ToggleLeft, ToggleRight, Loader2, Eye, EyeOff, RefreshCw } from "lucide-react"
import Modal from "@/components/ui/Modal"

type EventDef = {
  name: string
  category: string
  description: string
  variables: string[]
  defaultSubject: string
  defaultBody: string
}

type Template = {
  id: string
  eventKey: string
  name: string
  subject: string
  body: string
  variables: string[]
  isActive: boolean
}

type Settings = {
  enabled: boolean
  fromName: string
  fromEmail: string
  eventToggles: Record<string, boolean>
}

const CATEGORIES = ["Leave", "Documents", "People", "Admin"]

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8,
  fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  outline: "none", boxSizing: "border-box",
}

const btn = (variant: "primary" | "muted" | "danger" | "ghost" = "muted", extra?: React.CSSProperties): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
  fontSize: 13, fontWeight: 600,
  background: variant === "primary" ? "var(--primary)" : variant === "danger" ? "#fee2e2" : variant === "ghost" ? "transparent" : "var(--muted)",
  color: variant === "primary" ? "white" : variant === "danger" ? "#dc2626" : "var(--foreground)",
  ...extra,
})

export default function EmailConfigSection() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"settings" | "events" | "templates">("settings")
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<Settings>({ enabled: false, fromName: "DSN HRMS", fromEmail: "", eventToggles: {} })
  const [togglesDirty, setTogglesDirty] = useState(false)
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingToggles, setSavingToggles] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok?: boolean; error?: string } | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [eventDefs, setEventDefs] = useState<Record<string, EventDef>>({})
  const [editTemplate, setEditTemplate] = useState<Template | null>(null)
  const [createForKey, setCreateForKey] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Template | null>(null)
  const [previewHtml, setPreviewHtml] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/settings/email")
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings({ enabled: d.settings.enabled, fromName: d.settings.fromName, fromEmail: d.settings.fromEmail, eventToggles: d.settings.eventToggles ?? {} })
        if (d.templates) setTemplates(d.templates)
        if (d.eventDefs) setEventDefs(d.eventDefs)
        setLoading(false)
      })
  }, [open])

  const saveSettings = async () => {
    setSaving(true)
    await fetch("/api/settings/email", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: settings.enabled, fromName: settings.fromName, fromEmail: settings.fromEmail }) })
    setSaving(false)
    setSettingsDirty(false)
  }

  const saveToggles = async () => {
    setSavingToggles(true)
    await fetch("/api/settings/email", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventToggles: settings.eventToggles }) })
    setSavingToggles(false)
    setTogglesDirty(false)
  }

  const sendTest = async () => {
    setTesting(true)
    setTestResult(null)
    const r = await fetch("/api/settings/email/test", { method: "POST" })
    const d = await r.json()
    setTestResult(r.ok ? { ok: true } : { error: d.error })
    setTesting(false)
  }

  const toggleMaster = async (val: boolean) => {
    const next = { ...settings, enabled: val }
    setSettings(next)
    await fetch("/api/settings/email", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: val }) })
  }

  const toggleEvent = (key: string) => {
    const current = settings.eventToggles[key] !== false
    setSettings(s => ({ ...s, eventToggles: { ...s.eventToggles, [key]: !current } }))
    setTogglesDirty(true)
  }

  const saveTemplate = async (data: Partial<Template> & { eventKey: string }) => {
    if (data.id) {
      const r = await fetch(`/api/settings/email/templates/${data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      const d = await r.json()
      if (r.ok) setTemplates(t => t.map(x => x.id === data.id ? d.template : x))
    } else {
      const r = await fetch("/api/settings/email/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      const d = await r.json()
      if (r.ok) setTemplates(t => [...t, d.template])
    }
    setEditTemplate(null)
    setCreateForKey(null)
  }

  const deleteTemplate = async (t: Template) => {
    await fetch(`/api/settings/email/templates/${t.id}`, { method: "DELETE" })
    setTemplates(ts => ts.filter(x => x.id !== t.id))
    setDeleteConfirm(null)
  }

  const templateMap = new Map(templates.map(t => [t.eventKey, t]))

  return (
    <>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
          <button onClick={() => setOpen(o => !o)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Email Configuration</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
                {settings.enabled ? `Enabled · sending from ${settings.fromEmail || "…"}` : "Configure and enable email notifications"}
              </div>
            </div>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Master toggle pill */}
            <button onClick={() => toggleMaster(!settings.enabled)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 20, border: "none", background: settings.enabled ? "#dcfce7" : "#fee2e2", cursor: "pointer", fontSize: 12, fontWeight: 700, color: settings.enabled ? "#16a34a" : "#dc2626" }}>
              {settings.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {settings.enabled ? "On" : "Off"}
            </button>
            <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}>
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {open && (
          <div style={{ borderTop: "1px solid var(--border)" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}><Loader2 size={20} style={{ animation: "spin .8s linear infinite" }} /></div>
            ) : (
              <>
                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 24px" }}>
                  {(["settings", "events", "templates"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{ padding: "12px 4px", marginRight: 24, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? "var(--primary)" : "var(--muted-foreground)", borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent", textTransform: "capitalize" }}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* ── Settings Tab ────────────────────────────────────────── */}
                {tab === "settings" && (
                  <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>From Name</label>
                        <input style={inp} value={settings.fromName} onChange={e => { setSettings(s => ({ ...s, fromName: e.target.value })); setSettingsDirty(true) }} placeholder="DSN HRMS" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>From Email</label>
                        <input style={inp} type="email" value={settings.fromEmail} onChange={e => { setSettings(s => ({ ...s, fromEmail: e.target.value })); setSettingsDirty(true) }} placeholder="noreply@hrms.dsnsandbox.com" />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button onClick={saveSettings} disabled={saving || !settingsDirty} style={btn("primary", { opacity: saving || !settingsDirty ? 0.5 : 1 })}>
                        {saving ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : null} Save Settings
                      </button>
                      <button onClick={sendTest} disabled={testing} style={btn("muted", { opacity: testing ? 0.6 : 1 })}>
                        {testing ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : <Send size={13} />} Send Test Email
                      </button>
                      {testResult && (
                        <span style={{ fontSize: 13, fontWeight: 600, color: testResult.ok ? "#16a34a" : "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
                          {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {testResult.ok ? "Test email sent to your inbox!" : testResult.error}
                        </span>
                      )}
                    </div>

                  </div>
                )}

                {/* ── Events Tab ──────────────────────────────────────────── */}
                {tab === "events" && (
                  <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                    {CATEGORIES.map(cat => {
                      const events = Object.entries(eventDefs).filter(([, def]) => def.category === cat)
                      if (events.length === 0) return null
                      return (
                        <div key={cat}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 10 }}>{cat}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                            {events.map(([key, def]) => {
                              const on = settings.eventToggles[key] !== false
                              return (
                                <div key={key} style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{def.name}</div>
                                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{def.description}</div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {!templateMap.has(key) && (
                                      <span style={{ fontSize: 11, background: "#fef3c7", color: "#d97706", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>No template</span>
                                    )}
                                    <button onClick={() => toggleEvent(key)} style={{ background: "none", border: "none", cursor: "pointer", color: on ? "#16a34a" : "#dc2626", padding: 2 }}>
                                      {on ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    {togglesDirty && (
                      <div>
                        <button onClick={saveToggles} disabled={savingToggles} style={btn("primary")}>
                          {savingToggles ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : null} Save Event Settings
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Templates Tab ───────────────────────────────────────── */}
                {tab === "templates" && (
                  <div style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{templates.length} template{templates.length !== 1 ? "s" : ""} configured · {Object.keys(eventDefs).length - templates.length} events without a template</div>
                      <button onClick={() => setCreateForKey("")} style={btn("primary")}>
                        <Plus size={14} /> New Template
                      </button>
                    </div>

                    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                      {/* Header row */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto auto", gap: 0, background: "var(--muted)", padding: "9px 16px", borderBottom: "1px solid var(--border)" }}>
                        {["Event", "Subject", "Status", ""].map(h => (
                          <div key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>{h}</div>
                        ))}
                      </div>
                      {templates.length === 0 && (
                        <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                          No templates yet. Create one to start sending emails for that event.
                        </div>
                      )}
                      {templates.map((t, i) => (
                        <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto auto", gap: 0, padding: "12px 16px", borderBottom: i < templates.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{eventDefs[t.eventKey]?.name ?? t.eventKey}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{t.eventKey}</div>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--muted-foreground)", paddingRight: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                          <div style={{ paddingRight: 16 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: t.isActive ? "#dcfce7" : "#f3f4f6", color: t.isActive ? "#16a34a" : "#6b7280" }}>
                              {t.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setEditTemplate(t)} style={btn("ghost", { padding: "6px 8px" })} title="Edit"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteConfirm(t)} style={btn("ghost", { padding: "6px 8px", color: "#dc2626" })} title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Unconfigured events hint */}
                    {Object.keys(eventDefs).filter(k => !templateMap.has(k)).length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Events without templates</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {Object.entries(eventDefs).filter(([k]) => !templateMap.has(k)).map(([key, def]) => (
                            <button key={key} onClick={() => setCreateForKey(key)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "1px dashed var(--border)", background: "var(--card)", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 5 }}>
                              <Plus size={11} /> {def.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Edit / Create Template Modal ─────────────────────────────────── */}
      {(editTemplate !== null || createForKey !== null) && (
        <TemplateModal
          template={editTemplate}
          initialEventKey={createForKey ?? ""}
          eventDefs={eventDefs}
          existingKeys={new Set(templates.map(t => t.eventKey))}
          onClose={() => { setEditTemplate(null); setCreateForKey(null) }}
          onSave={saveTemplate}
          previewHtml={previewHtml}
          setPreviewHtml={setPreviewHtml}
        />
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <Modal open onClose={() => setDeleteConfirm(null)} title="Delete Template" width={440}>
          <div style={{ padding: 24 }}>
            <p style={{ fontSize: 14, color: "var(--foreground)", margin: "0 0 20px" }}>
              Delete the template for <strong>{eventDefs[deleteConfirm.eventKey]?.name ?? deleteConfirm.eventKey}</strong>? Emails for this event will stop sending.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={btn("muted")}>Cancel</button>
              <button onClick={() => deleteTemplate(deleteConfirm)} style={btn("danger")}>Delete Template</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Template Editor Modal ──────────────────────────────────────────────────────

function TemplateModal({ template, initialEventKey, eventDefs, existingKeys, onClose, onSave, previewHtml, setPreviewHtml }: {
  template: Template | null
  initialEventKey: string
  eventDefs: Record<string, EventDef>
  existingKeys: Set<string>
  onClose: () => void
  onSave: (data: any) => Promise<void>
  previewHtml: boolean
  setPreviewHtml: (v: boolean) => void
}) {
  const [eventKey, setEventKey] = useState(template?.eventKey ?? initialEventKey)
  const [name, setName] = useState(template?.name ?? eventDefs[initialEventKey]?.name ?? "")
  const [subject, setSubject] = useState(template?.subject ?? "")
  const [body, setBody] = useState(template?.body ?? "")
  const [isActive, setIsActive] = useState(template?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const def = eventDefs[eventKey]
  const isEdit = !!template

  const loadDefault = () => {
    if (!def) return
    setSubject(def.defaultSubject)
    setBody(def.defaultBody)
    if (!name) setName(def.name)
  }

  const submit = async () => {
    if (!eventKey || !name || !subject || !body) { setErr("All fields are required"); return }
    setSaving(true)
    await onSave({ id: template?.id, eventKey, name, subject, body, variables: def?.variables ?? [], isActive })
    setSaving(false)
  }

  // Available event keys for new template (not yet configured, or current event if editing)
  const availableKeys = isEdit
    ? Object.keys(eventDefs)
    : Object.keys(eventDefs).filter(k => !existingKeys.has(k))

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit Template" : "Create Template"} width={860}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left: form */}
        <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", borderRight: "1px solid var(--border)" }}>
          {/* Event selector (new only) */}
          {!isEdit && (
            <div>
              <label style={label}>Event Type</label>
              <select style={{ ...inp }} value={eventKey} onChange={e => {
                const k = e.target.value
                setEventKey(k)
                const d = eventDefs[k]
                if (d) { setName(d.name); setSubject(d.defaultSubject); setBody(d.defaultBody) }
              }}>
                <option value="">— Select event —</option>
                {availableKeys.map(k => <option key={k} value={k}>{eventDefs[k]?.name ?? k}</option>)}
              </select>
            </div>
          )}
          {isEdit && (
            <div style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
              <span style={{ color: "var(--muted-foreground)" }}>Event: </span>
              <strong>{eventDefs[eventKey]?.name ?? eventKey}</strong>
              <span style={{ marginLeft: 8, fontSize: 11, color: "var(--muted-foreground)" }}>({eventKey})</span>
            </div>
          )}

          <div>
            <label style={label}>Template Name</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Leave Approval — Project Lead" />
          </div>

          <div>
            <label style={label}>Subject Line</label>
            <input style={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Action Required: {{employeeName}} needs your approval" />
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...label, margin: 0 }}>Email Body (HTML)</label>
              <div style={{ display: "flex", gap: 8 }}>
                {def && (
                  <button onClick={loadDefault} style={btn("muted", { padding: "5px 10px", fontSize: 12 })}>
                    <RefreshCw size={11} /> Load Default
                  </button>
                )}
                <button onClick={() => setPreviewHtml(!previewHtml)} style={btn("muted", { padding: "5px 10px", fontSize: 12 })}>
                  {previewHtml ? <EyeOff size={11} /> : <Eye size={11} />}
                  {previewHtml ? "Edit" : "Preview"}
                </button>
              </div>
            </div>
            {previewHtml ? (
              <div style={{ flex: 1, minHeight: 280, border: "1px solid var(--border)", borderRadius: 8, overflow: "auto", background: "white" }}>
                <div dangerouslySetInnerHTML={{ __html: body }} style={{ padding: 20, fontSize: 14 }} />
              </div>
            ) : (
              <textarea
                style={{ ...inp, flex: 1, minHeight: 280, fontFamily: "monospace", fontSize: 12, resize: "vertical", lineHeight: 1.5 }}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Enter HTML body. Use {{variable}} placeholders. See available variables on the right."
              />
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 15, height: 15 }} />
              <span style={{ fontWeight: 600 }}>Active</span>
              <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>(emails send only when active)</span>
            </label>
          </div>

          {err && <div style={{ fontSize: 13, color: "#dc2626" }}>{err}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button onClick={onClose} style={btn("muted")}>Cancel</button>
            <button onClick={submit} disabled={saving} style={btn("primary", { opacity: saving ? 0.6 : 1 })}>
              {saving ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : null}
              {isEdit ? "Save Changes" : "Create Template"}
            </button>
          </div>
        </div>

        {/* Right: variables reference */}
        <div style={{ width: 220, padding: 20, background: "var(--muted)", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 12 }}>Available Variables</div>
          {def ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {def.variables.map(v => (
                <div key={v} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", fontFamily: "monospace", fontSize: 12, color: "var(--primary)", cursor: "default" }}>
                  {`{{${v}}}`}
                </div>
              ))}
              {def.variables.length === 0 && <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No variables for this event.</div>}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Select an event to see available variables.</div>
          )}
          <div style={{ marginTop: 20, fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            Copy a variable and paste it into the subject or body. The value will be replaced when the email is sent.
          </div>
        </div>
      </div>
    </Modal>
  )
}
