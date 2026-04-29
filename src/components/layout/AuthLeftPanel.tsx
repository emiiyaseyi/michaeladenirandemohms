const STATS = [["60+","Employees"],["17","Departments"],["36","States"],["7+","Years"]]

export default function AuthLeftPanel() {
  return (
    <div className="lg-flex" style={{
      display: "none", width: "46%",
      background: "var(--sidebar-bg)",
      flexDirection: "column", justifyContent: "space-between",
      padding: "48px 56px", position: "relative", overflow: "hidden",
    }}>
      {/* Background rings */}
      <div style={{ position: "absolute", top: -120, right: -120, width: 480, height: 480, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -60, right: -60, width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -100, left: -80, width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />

      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 5, flexShrink: 0 }}>
          <img src="/dsn-logo.svg" alt="DSN" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "white", letterSpacing: "-0.02em", lineHeight: 1.2 }}>DSN HRMS</div>
          <div style={{ fontSize: 11, color: "var(--sidebar-fg)" }}>Data Science Nigeria</div>
        </div>
      </div>

      {/* Hero */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(227,25,42,0.15)", borderRadius: 20, padding: "4px 12px", marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E3192A", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "#F87171", fontWeight: 600 }}>HR Platform</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 900, color: "white", lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.03em" }}>
          Manage your people,<br />
          <span style={{ color: "#12A355" }}>empower your<br />mission.</span>
        </h1>
        <p style={{ color: "var(--sidebar-fg)", fontSize: 14, lineHeight: 1.8, maxWidth: 360 }}>
          DSN's unified HR platform — leave, payslips, performance, offboarding and insights, all in one place.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {STATS.map(([v, l]) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 12, color: "var(--sidebar-fg)", marginTop: 4, fontWeight: 500 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
