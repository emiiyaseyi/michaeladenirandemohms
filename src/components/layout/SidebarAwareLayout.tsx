"use client"
import AnnouncementRenderer from "@/components/layout/AnnouncementRenderer"

export default function SidebarAwareLayout({ children, userRole, topBar }: {
  children: React.ReactNode
  userRole?: string
  topBar?: React.ReactNode
}) {
  return (
    <div
      className="content-shell"
      style={{
        marginLeft: 240,
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <div
        className="mobile-nav-overlay"
        onClick={() => document.body.classList.remove("mobile-nav-open")}
      />
      <div style={{ position: "sticky", top: 0, zIndex: 40 }}>
        <AnnouncementRenderer userRole={userRole ?? "STAFF"} />
        {topBar}
      </div>
      {children}
    </div>
  )
}
