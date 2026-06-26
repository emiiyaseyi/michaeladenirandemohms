"use client"
import { useState, useEffect, useCallback } from "react"
import Card from "@/components/ui/Card"
import { Trash2, RotateCcw, AlertCircle, Loader2, Megaphone, FileText, Briefcase, X } from "lucide-react"
import { formatDate } from "@/lib/utils"

type Tab = "announcements" | "documents" | "projects"

function EmptyTrash({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "40px 24px", textAlign: "center" }}>
      <Trash2 size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
      <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No deleted {label} in trash</div>
    </div>
  )
}

export default function TrashPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("announcements")
  const [processing, setProcessing] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/trash")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const restore = async (type: string, id: string) => {
    setProcessing(id)
    await fetch("/api/trash", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    })
    setProcessing(null)
    load()
  }

  const permanentDelete = async (type: string, id: string) => {
    setProcessing(id)
    await fetch(`/api/trash?type=${type}&id=${id}`, { method: "DELETE" })
    setProcessing(null)
    setConfirmDelete(null)
    load()
  }

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: "announcements", label: "Announcements", icon: Megaphone, count: data?.announcements?.length ?? 0 },
    { key: "documents", label: "Documents", icon: FileText, count: data?.documents?.length ?? 0 },
    { key: "projects", label: "Projects", icon: Briefcase, count: data?.projects?.length ?? 0 },
  ]

  const totalCount = (data?.announcements?.length ?? 0) + (data?.documents?.length ?? 0) + (data?.projects?.length ?? 0)

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
          <Trash2 size={20} /> Trash / Recycle Bin
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
          Deleted items are stored here. Restore them or permanently delete them.
          {totalCount > 0 && <span style={{ marginLeft: 8, fontWeight: 700, color: "var(--accent)" }}>{totalCount} item{totalCount !== 1 ? "s" : ""} in trash</span>}
        </p>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 12, color: "var(--muted-foreground)" }}>
          <Loader2 size={20} style={{ animation: "spin .8s linear infinite" }} />
          <span style={{ fontSize: 14 }}>Loading trash…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && (
        <Card>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 4px" }}>
            {tabs.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "12px 18px", border: "none", borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                  background: "transparent", cursor: "pointer", color: active ? "var(--primary)" : "var(--muted-foreground)", fontWeight: active ? 700 : 400, fontSize: 13, marginBottom: -1,
                }}>
                  <Icon size={14} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 800, background: active ? "var(--primary)" : "var(--muted-foreground)", color: "white", borderRadius: 20, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div style={{ padding: "8px 0" }}>
            {activeTab === "announcements" && (
              data?.announcements?.length === 0 ? <EmptyTrash label="announcements" /> :
              (data?.announcements ?? []).map((ann: any) => (
                <div key={ann.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--danger-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Megaphone size={16} style={{ color: "var(--accent)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{ann.title}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                      Retired {ann.retiredAt ? formatDate(ann.retiredAt, "MMM d, yyyy") : "-"} · by {ann.createdBy?.name ?? "-"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => restore("announcement", ann.id)} disabled={processing === ann.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid var(--success)", borderRadius: 7, background: "var(--success-bg)", color: "var(--success)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button onClick={() => setConfirmDelete({ type: "announcement", id: ann.id, name: ann.title })} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--muted)", color: "var(--accent)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      <X size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}

            {activeTab === "documents" && (
              data?.documents?.length === 0 ? <EmptyTrash label="documents" /> :
              (data?.documents ?? []).map((doc: any) => (
                <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={16} style={{ color: "var(--muted-foreground)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{doc.title}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {doc.category} · Deleted {formatDate(doc.updatedAt, "MMM d, yyyy")} · by {doc.uploadedBy?.name ?? "-"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => restore("document", doc.id)} disabled={processing === doc.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid var(--success)", borderRadius: 7, background: "var(--success-bg)", color: "var(--success)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button onClick={() => setConfirmDelete({ type: "document", id: doc.id, name: doc.title })} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--muted)", color: "var(--accent)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      <X size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}

            {activeTab === "projects" && (
              data?.projects?.length === 0 ? <EmptyTrash label="projects" /> :
              (data?.projects ?? []).map((proj: any) => (
                <div key={proj.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Briefcase size={16} style={{ color: "var(--muted-foreground)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{proj.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {proj.description ?? "No description"} · Cancelled {formatDate(proj.updatedAt, "MMM d, yyyy")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => restore("project", proj.id)} disabled={processing === proj.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid var(--success)", borderRadius: 7, background: "var(--success-bg)", color: "var(--success)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button onClick={() => setConfirmDelete({ type: "project", id: proj.id, name: proj.name })} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--muted)", color: "var(--accent)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      <X size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Permanent delete confirm dialog */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card)", borderRadius: 14, padding: 28, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--danger-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertCircle size={20} style={{ color: "var(--accent)" }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Permanently Delete?</div>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20, lineHeight: 1.5 }}>
              <strong style={{ color: "var(--foreground)" }}>{confirmDelete.name}</strong> will be permanently deleted and cannot be recovered.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => permanentDelete(confirmDelete.type, confirmDelete.id)} disabled={processing === confirmDelete.id} style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: "var(--accent)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
