import { initials } from "@/lib/utils"

export default function Avatar({ name, photo, size = 32 }: { name?: string | null; photo?: string | null; size?: number }) {
  const colors = ["#0052A5","#E3192A","#0B8A4A","#7C3AED","#C2410C","#0E7490"]
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  if (photo) return <img src={photo} alt={name ?? ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "white", flexShrink: 0, letterSpacing: "-0.5px" }}>
      {initials(name)}
    </div>
  )
}
