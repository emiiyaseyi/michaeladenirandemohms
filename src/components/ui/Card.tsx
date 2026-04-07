import { ReactNode } from "react"

export default function Card({ children, style, className, onClick }: { children: ReactNode; style?: React.CSSProperties; className?: string; onClick?: () => void }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", ...style }} className={className} onClick={onClick}>
      {children}
    </div>
  )
}
