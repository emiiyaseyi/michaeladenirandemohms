"use client"
import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Bus, Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { MORNING_STOPS, AFTERNOON_STOPS } from "@/lib/bus-utils"

type TripState = {
  total: number
  staffCount: number
  lowerCount: number
  myBooking: any | null
  isBusDay: boolean
  windowStatus: "before" | "open" | "closed" | "no_bus_today"
  openTime: string
  closeTime: string
  nextBusDay: string | null
  tier: "staff" | "intern" | "associate"
}

function StatusChip({ status, openTime, closeTime }: { status: string; openTime: string; closeTime: string }) {
  if (status === "open") return (
    <span style={{ padding: "4px 12px", borderRadius: 20, background: "#DCFCE7", color: "#15803D", fontSize: 12, fontWeight: 700 }}>Open ✓</span>
  )
  if (status === "before") return (
    <span style={{ padding: "4px 12px", borderRadius: 20, background: "#F3F4F6", color: "#6B7280", fontSize: 12, fontWeight: 600 }}>Opens {openTime}</span>
  )
  if (status === "closed") return (
    <span style={{ padding: "4px 12px", borderRadius: 20, background: "#FEE2E2", color: "#DC2626", fontSize: 12, fontWeight: 600 }}>Closed at {closeTime}</span>
  )
  return null
}

export default function BusBookingPage() {
  const { data: session } = useSession()
  const [trip, setTrip] = useState<"MORNING" | "AFTERNOON">("MORNING")
  const [stop, setStop] = useState("")
  const [morning, setMorning] = useState<TripState | null>(null)
  const [afternoon, setAfternoon] = useState<TripState | null>(null)
  const [booking, setBooking] = useState(false)
  const [bookErr, setBookErr] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [cancelErr, setCancelErr] = useState("")
  const [history, setHistory] = useState<any[]>([])
  const [historyTrip, setHistoryTrip] = useState<"" | "MORNING" | "AFTERNOON">("")

  const fetchTrip = useCallback(async (t: "MORNING" | "AFTERNOON") => {
    const d = await fetch(`/api/bus-bookings?trip=${t}`).then(r => r.json())
    if (t === "MORNING") setMorning(d)
    else setAfternoon(d)
  }, [])

  const fetchHistory = useCallback(async () => {
    const param = historyTrip ? `?trip=${historyTrip}` : ""
    const d = await fetch(`/api/bus-bookings/my-history${param}`).then(r => r.json())
    setHistory(d.bookings ?? [])
  }, [historyTrip])

  useEffect(() => {
    fetchTrip("MORNING")
    fetchTrip("AFTERNOON")
    fetchHistory()
    const t = setInterval(() => { fetchTrip("MORNING"); fetchTrip("AFTERNOON") }, 60_000)
    return () => clearInterval(t)
  }, [fetchTrip])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const activeState = trip === "MORNING" ? morning : afternoon
  const stops = trip === "MORNING" ? MORNING_STOPS.slice(0, -1) : AFTERNOON_STOPS.slice(1)

  const handleBook = async () => {
    if (!stop) { setBookErr("Please select your stop"); return }
    setBooking(true); setBookErr("")
    const res = await fetch("/api/bus-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip, stop }),
    })
    const d = await res.json()
    setBooking(false)
    if (!res.ok) { setBookErr(d.error ?? "Booking failed"); return }
    fetchTrip(trip)
    fetchHistory()
    setStop("")
  }

  const handleCancel = async (id: string) => {
    setCancelling(true)
    setCancelErr("")
    const res = await fetch(`/api/bus-bookings/${id}`, { method: "DELETE" })
    setCancelling(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setCancelErr(d.error ?? "Cancel failed - try again.")
      return
    }
    await fetchTrip(trip)
    fetchHistory()
  }

  if (!morning && !afternoon) {
    return <div style={{ padding: "28px 32px", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
  }

  // TESTING: bus always available while testing - server returns isBusDay:true when TESTING_ALWAYS_OPEN is set
  const noBusDay = morning?.isBusDay === false

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Bus size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Bus Booking</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          14-seater shuttle - Mon / Wed / Fri only. Seats allocated at 7:45 AM (morning) and 3:50 PM (afternoon).
        </p>
      </div>

      {/* No bus today */}
      {noBusDay && (
        <div style={{ padding: "32px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, textAlign: "center" }}>
          <Bus size={40} style={{ color: "var(--muted-foreground)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No bus service today</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Next bus day: <strong>{morning?.nextBusDay}</strong>. Bus runs every Monday, Wednesday, and Friday.
          </p>
        </div>
      )}

      {!noBusDay && (
        <div className="bus-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* Booking form */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Book a Seat</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                {(session?.user as any)?.name ?? "You"} ·{" "}
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{activeState?.tier ?? "Staff"}</span>
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {/* Trip selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {(["MORNING", "AFTERNOON"] as const).map(t => {
                  const s = t === "MORNING" ? morning : afternoon
                  const active = trip === t
                  return (
                    <button key={t} onClick={() => { setTrip(t); setStop(""); setBookErr("") }}
                      style={{ padding: "12px", border: `2px solid ${active ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, cursor: "pointer", background: active ? "rgba(22,163,74,0.06)" : "var(--background)", textAlign: "center", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 18, marginBottom: 3 }}>{t === "MORNING" ? "🌅" : "🌆"}</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{t === "MORNING" ? "Morning" : "Afternoon"}</div>
                      <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>
                        {s ? `${s.total} booked` : "…"}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Window status */}
              {activeState && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Clock size={14} style={{ color: "var(--muted-foreground)" }} />
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {activeState.tier === "staff" || trip === "MORNING" ? "" : `Your window: ${activeState.openTime} – `}
                    {trip === "MORNING" ? `${activeState.openTime} – ` : ""}{activeState.closeTime}
                  </span>
                  <StatusChip status={activeState.windowStatus} openTime={activeState.openTime} closeTime={activeState.closeTime} />
                </div>
              )}

              {/* Already booked */}
              {activeState?.myBooking && activeState.myBooking.status !== "CANCELLED" ? (
                <div>
                  {activeState.myBooking.status === "CONFIRMED" ? (
                    <div style={{ padding: "16px", background: "#DCFCE7", borderRadius: 10, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <CheckCircle2 size={18} style={{ color: "#15803D" }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#15803D" }}>Seat #{activeState.myBooking.seatNumber} Confirmed!</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#166534" }}>Stop: {activeState.myBooking.stop}</div>
                    </div>
                  ) : activeState.myBooking.status === "BOUNCED" ? (
                    <div style={{ padding: "16px", background: "#FEE2E2", borderRadius: 10, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <XCircle size={18} style={{ color: "#DC2626" }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#DC2626" }}>No seat available</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#991B1B", marginTop: 4 }}>Please find alternative transport.</div>
                    </div>
                  ) : (
                    <div style={{ padding: "16px", background: "#EFF6FF", borderRadius: 10, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#1D4ED8" }}>Booking pending allocation</div>
                          <div style={{ fontSize: 12, color: "#1E40AF", marginTop: 2 }}>Stop: {activeState.myBooking.stop} · Seats assigned at {activeState.closeTime}</div>
                        </div>
                        {activeState.windowStatus === "open" && (
                          <button onClick={() => handleCancel(activeState.myBooking.id)} disabled={cancelling}
                            style={{ padding: "5px 12px", background: "none", border: "1px solid #BFDBFE", borderRadius: 6, cursor: "pointer", fontSize: 11, color: "#1D4ED8", fontWeight: 600 }}>
                            {cancelling ? "…" : "Cancel"}
                          </button>
                        )}
                      </div>
                      {cancelErr && (
                        <div style={{ marginTop: 8, fontSize: 11, color: "#DC2626" }}>{cancelErr}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : activeState?.windowStatus === "open" ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 6 }}>
                      {trip === "MORNING" ? "Your Pickup Stop" : "Your Drop-off Stop"}
                    </label>
                    <div style={{ position: "relative" }}>
                      <select value={stop} onChange={e => setStop(e.target.value)}
                        style={{ width: "100%", padding: "10px 36px 10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", appearance: "none", cursor: "pointer" }}>
                        <option value="">-- Select stop --</option>
                        {stops.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted-foreground)" }} />
                    </div>
                  </div>
                  {bookErr && (
                    <div style={{ padding: "8px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 12, color: "#DC2626", marginBottom: 10, display: "flex", gap: 6, alignItems: "center" }}>
                      <AlertCircle size={13} />{bookErr}
                    </div>
                  )}
                  <button onClick={handleBook} disabled={booking || !stop}
                    style={{ width: "100%", padding: "12px", background: "var(--primary)", border: "none", borderRadius: 10, cursor: booking || !stop ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, color: "white", opacity: booking || !stop ? 0.6 : 1 }}>
                    {booking ? "Booking…" : `Book ${trip === "MORNING" ? "Morning" : "Afternoon"} Seat`}
                  </button>
                </>
              ) : (
                <div style={{ padding: "20px", background: "var(--muted)", borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)", fontWeight: 600 }}>
                    {activeState?.windowStatus === "before"
                      ? `Booking opens at ${activeState.openTime} for ${activeState.tier === "staff" ? "staff" : "interns/associates"}`
                      : "Booking window closed"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule info */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Today's Schedule</div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {/* Morning */}
              <div style={{ marginBottom: 16, padding: "12px", background: "var(--muted)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>🌅 Morning</span>
                  <StatusChip status={morning?.windowStatus ?? "closed"} openTime={morning?.openTime ?? "7:00 AM"} closeTime="7:45 AM" />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>All roles · 7:00 – 7:45 AM</div>
                <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>{morning?.total ?? 0} bookings</div>
              </div>
              {/* Afternoon */}
              <div style={{ padding: "12px", background: "var(--muted)", borderRadius: 10, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>🌆 Afternoon</span>
                  <StatusChip status={afternoon?.windowStatus ?? "closed"} openTime={afternoon?.openTime ?? "1:00 PM"} closeTime="3:50 PM" />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Staff/PL: 1:00 PM · Intern/Associate: 2:30 PM</div>
                <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>{afternoon?.total ?? 0} bookings</div>
              </div>
              {/* Note */}
              <div style={{ padding: "10px 12px", background: "#FEF3C7", borderRadius: 8, fontSize: 11, color: "#92400E" }}>
                ℹ️ Seats are allocated at closing time. Staff members have priority over interns/associates when the bus is over capacity.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Booking History */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>My Booking History</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["", "MORNING", "AFTERNOON"] as const).map(t => (
              <button key={t} onClick={() => setHistoryTrip(t)}
                style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${historyTrip === t ? "var(--primary)" : "var(--border)"}`, background: historyTrip === t ? "var(--primary)" : "transparent", color: historyTrip === t ? "white" : "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {t === "" ? "All" : t === "MORNING" ? "Morning" : "Afternoon"}
              </button>
            ))}
          </div>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No booking history yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--muted)" }}>
                  {["Date", "Trip", "Stop", "Booked At", "Result"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(b => (
                  <tr key={b.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>{format(new Date(b.bookingDate), "EEE dd MMM yyyy")}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>{b.trip === "MORNING" ? "Morning" : "Afternoon"}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>{b.stop}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                      {format(new Date(b.bookedAt), "h:mm a")}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {b.status === "CONFIRMED" ? (
                        <span style={{ color: "#15803D", fontWeight: 700, fontSize: 12 }}>✓ Seat #{b.seatNumber}</span>
                      ) : b.status === "BOUNCED" ? (
                        <span style={{ color: "#DC2626", fontWeight: 700, fontSize: 12 }}>✗ No seat</span>
                      ) : b.status === "CANCELLED" ? (
                        <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>Cancelled</span>
                      ) : (
                        <span style={{ color: "#1D4ED8", fontWeight: 600, fontSize: 12 }}>Pending allocation</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .bus-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
