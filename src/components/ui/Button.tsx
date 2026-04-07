import { ReactNode } from "react"
import { Loader2 } from "lucide-react"

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline"

export default function Button({ children, onClick, variant = "primary", size = "md", loading, disabled, type = "button", style }: {
  children: ReactNode; onClick?: () => void; variant?: Variant; size?: "sm"|"md"|"lg";
  loading?: boolean; disabled?: boolean; type?: "button"|"submit"|"reset"; style?: React.CSSProperties
}) {
  const styles: Record<Variant, React.CSSProperties> = {
    primary: { background: "var(--primary)", color: "white", border: "1px solid var(--primary)" },
    secondary: { background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" },
    danger: { background: "var(--accent)", color: "white", border: "1px solid var(--accent)" },
    ghost: { background: "transparent", color: "var(--muted-foreground)", border: "1px solid transparent" },
    outline: { background: "transparent", color: "var(--primary)", border: "1px solid var(--primary)" },
  }
  const sizes = { sm: { padding: "6px 12px", fontSize: 12 }, md: { padding: "8px 16px", fontSize: 13 }, lg: { padding: "10px 20px", fontSize: 14 } }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} style={{ ...styles[variant], ...sizes[size], borderRadius: 8, cursor: disabled || loading ? "not-allowed" : "pointer", opacity: disabled || loading ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, transition: "all 0.15s", ...style }}>
      {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
      {children}
    </button>
  )
}
