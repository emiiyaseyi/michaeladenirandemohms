import { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: () => void
  /** Optional title - renders a header section with a bottom border. */
  title?: ReactNode
  /** Optional content padding. Defaults to no padding (children control it). When title is present, defaults to 24px. */
  padded?: boolean
}

export default function Card({ children, style, className, onClick, title, padded }: CardProps) {
  const usePadding = padded ?? !!title
  return (
    <div
      style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", ...style }}
      className={className}
      onClick={onClick}
    >
      {title && (
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
          {title}
        </div>
      )}
      <div style={usePadding ? { padding: 24 } : undefined}>{children}</div>
    </div>
  )
}
