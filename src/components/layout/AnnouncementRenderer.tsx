"use client"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useSession } from "next-auth/react"
import { X, Megaphone, ChevronLeft, ChevronRight, Volume2 } from "lucide-react"

interface Announcement {
  id: string
  title: string
  body: string | null
  type: "TEXT" | "IMAGE" | "VIDEO"
  videoUrl: string | null
  imageUrl: string | null
  behavior: "POPUP" | "NOTIFICATION_BAR" | "DASHBOARD_SCROLL" | "EMAIL_ONLY"
  status: "PUBLISHED"
  targetRoles: string[]
  publishedAt: string | null
}

// Per-user key so two users sharing the same browser don't inherit each other's dismissals.
function seenKeyFor(userId: string): string {
  return `dsn_seen_announcements:${userId}`
}

function getSeenIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKeyFor(userId))
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function markSeen(userId: string, id: string) {
  try {
    const seen = getSeenIds(userId)
    seen.add(id)
    localStorage.setItem(seenKeyFor(userId), JSON.stringify([...seen]))
  } catch {}
}

function embedUrl(url: string): string | null {
  if (!url) return null
  // YouTube
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=0`
  // Vimeo
  const vim = url.match(/vimeo\.com\/(\d+)/)
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`
  // Google Drive
  const gdrive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (gdrive) return `https://drive.google.com/file/d/${gdrive[1]}/preview`
  // Direct link (mp4 etc) - use as-is
  return url
}

// ─── Popup ────────────────────────────────────────────────────────────────────

function PopupAnnouncement({ items, userId }: { items: Announcement[]; userId: string }) {
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(true)

  if (!open || items.length === 0) return null
  const item = items[idx]

  const close = () => {
    items.forEach(a => markSeen(userId, a.id))
    setOpen(false)
  }

  const jsx = (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(2px)",
    }}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div style={{
        background: "var(--card)", borderRadius: 16, width: "min(560px, 92vw)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column",
        animation: "slideUp 0.25s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Megaphone size={15} color="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>Announcement</span>
          </div>
          <button onClick={close} style={{ background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 6, padding: 6, display: "flex", color: "var(--muted-foreground)" }}>
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "var(--foreground)" }}>{item.title}</h2>

          {item.type === "IMAGE" && item.imageUrl && (
            <img src={item.imageUrl} alt={item.title}
              style={{ width: "100%", borderRadius: 10, marginBottom: 14, maxHeight: 280, objectFit: "cover" }} />
          )}

          {item.type === "VIDEO" && item.videoUrl && (() => {
            const src = embedUrl(item.videoUrl)
            return src ? (
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, marginBottom: 14, borderRadius: 10, overflow: "hidden" }}>
                <iframe src={src} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen />
              </div>
            ) : null
          })()}

          {item.body && <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{item.body}</p>}
        </div>

        {/* Pagination + Close */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          {items.length > 1 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "6px 10px", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{idx + 1} / {items.length}</span>
              <button onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))} disabled={idx === items.length - 1}
                style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "6px 10px", cursor: idx === items.length - 1 ? "default" : "pointer", opacity: idx === items.length - 1 ? 0.4 : 1 }}>
                <ChevronRight size={14} />
              </button>
            </div>
          ) : <div />}
          <button onClick={close}
            style={{ background: "var(--primary)", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            {items.length > 1 && idx < items.length - 1 ? "Next" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== "undefined" ? createPortal(jsx, document.body) : null
}

// ─── Notification Bar ─────────────────────────────────────────────────────────

function NotificationBarAnnouncement({ items, userId }: { items: Announcement[]; userId: string }) {
  const [idx, setIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 4500)
    return () => clearInterval(t)
  }, [items.length])

  if (dismissed || items.length === 0) return null
  const item = items[idx]

  return (
    <div style={{
      background: "var(--primary)", color: "white",
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 16px", fontSize: 13, fontWeight: 500,
      flexShrink: 0,
    }}>
      <Megaphone size={14} style={{ flexShrink: 0, opacity: 0.85 }} />
      <span style={{ fontWeight: 700, marginRight: 4, flexShrink: 0 }}>{item.title}:</span>
      <span style={{ flex: 1, opacity: 0.92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.body}</span>
      {items.length > 1 && (
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          {items.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              style={{ width: 6, height: 6, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: i === idx ? "white" : "rgba(255,255,255,0.4)", transition: "all 0.2s" }} />
          ))}
        </div>
      )}
      <button onClick={() => { items.forEach(a => markSeen(userId, a.id)); setDismissed(true) }}
        style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer", color: "white", display: "flex", alignItems: "center", flexShrink: 0 }}>
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Dashboard Scroll Ticker ──────────────────────────────────────────────────

export function DashboardScrollTicker({ items, userId }: { items: Announcement[]; userId: string }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || items.length === 0) return null

  const text = items.map(a => `${a.title}${a.body ? ` - ${a.body}` : ""}`).join("   ·   ")

  return (
    <div style={{
      background: "var(--primary-50, #EBF3FF)", borderRadius: 10, border: "1px solid var(--primary)",
      display: "flex", alignItems: "center", gap: 10, overflow: "hidden", marginBottom: 20,
      padding: "10px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, color: "var(--primary)" }}>
        <Volume2 size={14} />
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em" }}>Notice</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          fontSize: 13,
          color: "var(--primary)",
          fontWeight: 500,
          animation: "marquee 18s linear infinite",
        }}>
          {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
        </div>
      </div>
      <button onClick={() => { items.forEach(a => markSeen(userId, a.id)); setDismissed(true) }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", flexShrink: 0, display: "flex", padding: 2 }}>
        <X size={13} />
      </button>
    </div>
  )
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export default function AnnouncementRenderer({ userRole: _userRole }: { userRole: string }) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetch("/api/announcements")
      .then(r => r.json())
      .then(d => {
        const all: Announcement[] = d.announcements ?? []
        const seen = getSeenIds(userId)
        const unseen = all.filter(a => !seen.has(a.id))
        setAnnouncements(unseen)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [userId])

  if (!userId || !loaded) return null

  const popups = announcements.filter(a => a.behavior === "POPUP")
  const bars = announcements.filter(a => a.behavior === "NOTIFICATION_BAR")

  if (bars.length === 0 && popups.length === 0) return null

  return (
    <div>
      {bars.length > 0 && <NotificationBarAnnouncement items={bars} userId={userId} />}
      {popups.length > 0 && <PopupAnnouncement items={popups} userId={userId} />}
    </div>
  )
}
