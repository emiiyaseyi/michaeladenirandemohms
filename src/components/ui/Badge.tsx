import { statusColor } from "@/lib/utils"

export default function Badge({ status, label }: { status: string; label?: string }) {
  const { bg, text } = statusColor(status)
  const display = label ?? status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span style={{ background: bg, color: text, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block" }}>
      {display}
    </span>
  )
}
