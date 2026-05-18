"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { DashboardScrollTicker } from "./AnnouncementRenderer"

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

export default function DashboardAnnouncements() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const [items, setItems] = useState<Announcement[]>([])

  useEffect(() => {
    if (!userId) return
    fetch("/api/announcements")
      .then(r => r.json())
      .then(d => {
        const all: Announcement[] = d.announcements ?? []
        setItems(all.filter(a => a.behavior === "DASHBOARD_SCROLL"))
      })
      .catch(() => {})
  }, [userId])

  if (!userId || items.length === 0) return null
  return <DashboardScrollTicker items={items} userId={userId} />
}
