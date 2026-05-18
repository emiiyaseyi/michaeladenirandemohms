"use client"

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
}

/**
 * Consistent page header: title (22px/800) + optional subtitle (13px/muted) + right-side action slot.
 * Drop in at the top of every admin/staff/PL page.
 *
 * @example
 *   <PageHeader title="Employees" subtitle="Manage your workforce" actions={<Button onClick={openAdd}>Add Employee</Button>} />
 */
export default function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <div
      className="page-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        {icon && (
          <div style={{ display: "flex", alignItems: "center", color: "var(--primary)", flexShrink: 0 }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0, lineHeight: 1.2 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4, margin: "4px 0 0 0" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
