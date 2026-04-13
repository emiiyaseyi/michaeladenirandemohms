"use client"
import { useState, useEffect } from "react"
import AnnouncementRenderer from "@/components/AnnouncementRenderer"

const COLLAPSED_KEY = "dsn_sidebar_collapsed"

export default function SidebarAwareLayout({ children, userRole }: { children: React.ReactNode; userRole?: string }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const check = () => {
      const saved = localStorage.getItem(COLLAPSED_KEY)
      setCollapsed(saved === "1")
    }
    check()
    const interval = setInterval(check, 150)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      marginLeft: collapsed ? 60 : 240,
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      transition: "margin-left 0.22s cubic-bezier(.4,0,.2,1)",
    }}>
      <AnnouncementRenderer userRole={userRole ?? "STAFF"} />
      {children}
    </div>
  )
}
