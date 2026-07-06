"use client"
import { useState, useEffect, useCallback } from "react"
import { Bus, Download, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { MORNING_STOPS, AFTERNOON_STOPS, MAX_SEATS } from "@/lib/bus-utils"

type Booking = {
  id: string; name: string; jobTitle: string; tier: string; dept: string
  trip: string; stop: string; seatNumber: number | null; status: string
  bookingDate: string; bookedAt: string
}
type Stats = { morningConfirmed: number; afternoonConfirmed: number; totalPending: number; totalBounced: number }

function fmtDate(s: string) {
  try { return format(new Date(s), "EEE dd MMM yyyy") } catch { return s }
}
function fmtTime(s: string) {
  try { return format(new Date(s), "h:mm a") } catch { return s }
}

const statusColor: Record<string, { bg: string; color: string }> = {
  CONFIRMED: { bg: "#DCFCE7", color: "#15803D" },
  BOUNCED:   { bg: "#FEE2E2", color: "#DC2626" },
  PENDING:   { bg: "#DBEAFE", color: "#1D4ED8" },
  CANCELLED: { bg: "#F3F4F6", color: "#6B7280" },
}

export default function AdminBusPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<Stats>({ morningConfirmed: 0, afternoonConfirmed: 0, totalPending: 0, totalBounced: 0 })
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [toDate, setToDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [tripFilter, setTripFilter] = useState<"" | "MORNING" | "AFTERNOON">("")
  const [activeTab, setActiveTab] = useState<"MORNING" | "AFTERNOON">("MORNING")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (fromDate) params.set("from", new Date(fromDate).toISOString())
    if (toDate) { const t = new Date(toDate); t.setUTCHours(23,59,59,999); params.set("to", t.toISOString()) }
    if (tripFilter) params.set("trip", tripFilter)
    const d = await fetch(`/api/bus-bookings/manifest?${params}`).then(r => r.json())
    setBookings(d.bookings ?? [])
    setStats(d.stats ?? { morningConfirmed: 0, afternoonConfirmed: 0, totalPending: 0, totalBounced: 0 })
    setLoading(false)
  }, [fromDate, toDate, tripFilter])

  useEffect(() => { load() }, [load])

  const filtered = tripFilter ? bookings : bookings.filter(b => b.trip === activeTab)

  const exportCSV = () => {
    const rows = [
      ["Name", "Tier", "Dept", "Trip", "Date", "Stop", "Seat", "Booked At", "Status"],
      ...bookings.map(b => [
        b.name, b.tier, b.dept, b.trip,
        fmtDate(b.bookingDate), b.stop,
        b.seatNumber ?? "", fmtTime(b.bookedAt), b.status,
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a"); a.href = url; a.download = `bus-bookings-${fromDate}-to-${toDate}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = async () => {
    const { utils, writeFile } = await import("xlsx")
    const headers = ["Name", "Tier", "Dept", "Trip", "Date", "Stop", "Seat #", "Booked At", "Status"]
    const rows = bookings.map(b => [
      b.name, b.tier, b.dept, b.trip,
      fmtDate(b.bookingDate), b.stop,
      b.seatNumber ?? "", fmtTime(b.bookedAt), b.status,
    ])
    const morning = bookings.filter(b => b.trip === "MORNING")
    const afternoon = bookings.filter(b => b.trip === "AFTERNOON")
    const wb = utils.book_new()
    utils.book_append_sheet(wb, utils.aoa_to_sheet([headers, ...rows]), "All Bookings")
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ["MDH SHUTTLE - MORNING MANIFEST"],
      [`Route: ${MORNING_STOPS.join(" → ")}`],
      [],
      ["Seat", "Passenger", "Tier", "Pickup Stop", "Booked At", "Status"],
      ...morning.map((b, i) => [i + 1, b.name, b.tier, b.stop, fmtTime(b.bookedAt), b.status]),
    ]), "Morning")
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ["MDH SHUTTLE - AFTERNOON MANIFEST"],
      [`Route: ${AFTERNOON_STOPS.join(" → ")}`],
      [],
      ["Seat", "Passenger", "Tier", "Drop-off Stop", "Booked At", "Status"],
      ...afternoon.map((b, i) => [i + 1, b.name, b.tier, b.stop, fmtTime(b.bookedAt), b.status]),
    ]), "Afternoon")
    writeFile(wb, `MDH_Shuttle_${fromDate}_to_${toDate}.xlsx`)
  }

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Bus size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Bus Manifest</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>View all shuttle bookings and allocation results.</p>
      </div>

      {/* Filters + Export */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, background: "var(--background)", color: "var(--foreground)", outline: "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, background: "var(--background)", color: "var(--foreground)", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["", "MORNING", "AFTERNOON"] as const).map(t => (
            <button key={t} onClick={() => setTripFilter(t)}
              style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${tripFilter === t ? "var(--primary)" : "var(--border)"}`, background: tripFilter === t ? "var(--primary)" : "transparent", color: tripFilter === t ? "white" : "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {t === "" ? "All Trips" : t === "MORNING" ? "🌅 Morning" : "🌆 Afternoon"}
            </button>
          ))}
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <RefreshCw size={13} /> Refresh
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Download size={13} /> CSV
          </button>
          <button onClick={exportExcel} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "none", borderRadius: 8, background: "#16A34A", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Download size={13} /> Excel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Morning Confirmed", value: `${stats.morningConfirmed}/${MAX_SEATS}`, color: "#3B82F6" },
          { label: "Afternoon Confirmed", value: `${stats.afternoonConfirmed}/${MAX_SEATS}`, color: "#F59E0B" },
          { label: "Total Pending", value: stats.totalPending, color: "#6366F1" },
          { label: "Total Bounced", value: stats.totalBounced, color: "#EF4444" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab selector (only when tripFilter = all) */}
      {!tripFilter && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["MORNING", "AFTERNOON"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: activeTab === t ? "var(--primary)" : "var(--muted)", color: activeTab === t ? "white" : "var(--muted-foreground)" }}>
              {t === "MORNING" ? "🌅 Morning" : "🌆 Afternoon"}
            </button>
          ))}
        </div>
      )}

      {/* Manifest table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["Seat", "Name", "Tier", "Dept", "Trip", "Date", "Stop", "Booked At", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>No bookings for this period.</td></tr>
              ) : filtered.map(b => {
                const sc = statusColor[b.status] ?? { bg: "#F3F4F6", color: "#374151" }
                return (
                  <tr key={b.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "11px 16px", fontWeight: 700, fontFamily: "monospace" }}>
                      {b.seatNumber ?? "–"}
                    </td>
                    <td style={{ padding: "11px 16px", fontWeight: 600 }}>{b.name}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: b.tier === "staff" ? "#DBEAFE" : b.tier === "intern" ? "#D1FAE5" : "#EDE9FE", color: b.tier === "staff" ? "#1E40AF" : b.tier === "intern" ? "#065F46" : "#5B21B6" }}>
                        {b.tier}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", color: "var(--muted-foreground)" }}>{b.dept}</td>
                    <td style={{ padding: "11px 16px" }}>{b.trip === "MORNING" ? "🌅 Morning" : "🌆 Afternoon"}</td>
                    <td style={{ padding: "11px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>{fmtDate(b.bookingDate)}</td>
                    <td style={{ padding: "11px 16px" }}>{b.stop}</td>
                    <td style={{ padding: "11px 16px", color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: 11 }}>{fmtTime(b.bookedAt)}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Route reference */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        {[
          { label: "Morning Route", sub: "To Office Hub, Yaba", stops: MORNING_STOPS, color: "#3B82F6" },
          { label: "Afternoon Route", sub: "From Office Hub, Yaba", stops: AFTERNOON_STOPS, color: "#F59E0B" },
        ].map(r => (
          <div key={r.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 10 }}>{r.sub}</div>
            {r.stops.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", fontSize: 12, borderBottom: i < r.stops.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: r.color, color: "white", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontWeight: s === "Office Hub, Yaba" ? 700 : 400 }}>{s}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
