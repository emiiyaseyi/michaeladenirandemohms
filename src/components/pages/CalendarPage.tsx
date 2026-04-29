"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_NUM_H   = 34  // px: height of day-number area per week row
const EVT_H       = 22  // px: height of each event row
const EVT_GAP     = 2   // px: gap between event bar and row edge
const MAX_LANES   = 3   // max visible event lanes per week row
const OVERFLOW_H  = 20  // px: height of "+X more" row

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const FULL_MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const WEEK_DAYS    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

const EVT_COLORS: Record<string, { bg: string; text: string }> = {
  leave:         { bg: "#4DABF7", text: "#fff" },
  leave_pending: { bg: "#74C0FC", text: "#fff" },
  birthday:      { bg: "#7C3AED", text: "#fff" },
  anniversary:   { bg: "#84CC16", text: "#fff" },
  holiday:       { bg: "#EF4444", text: "#fff" },
  payday:        { bg: "#F59E0B", text: "#fff" },
}

type CalEvent = { id: string; title: string; type: string; start: string; end: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

function ordinal(n: number): string {
  if (n === 1 || n === 21 || n === 31) return `${n}st`
  if (n === 2 || n === 22) return `${n}nd`
  if (n === 3 || n === 23) return `${n}rd`
  return `${n}th`
}

function buildWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1)
  const last  = new Date(year, month, 0)
  const start = new Date(first)
  start.setDate(start.getDate() - start.getDay())
  const weeks: Date[][] = []
  const cur = new Date(start)
  while (cur <= last || cur.getDay() !== 0) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
    weeks.push(week)
    if (cur > last && cur.getDay() === 0) break
  }
  return weeks
}

// Lane layout algorithm
function layoutWeek(events: CalEvent[], weekDays: Date[]) {
  const wStart = weekDays[0], wEnd = weekDays[6]

  const wEvts = events.filter(e => parseDate(e.end) >= wStart && parseDate(e.start) <= wEnd)
  wEvts.sort((a, b) => {
    const aLen = parseDate(a.end).getTime() - parseDate(a.start).getTime()
    const bLen = parseDate(b.end).getTime() - parseDate(b.start).getTime()
    if (bLen !== aLen) return bLen - aLen
    return parseDate(a.start).getTime() - parseDate(b.start).getTime()
  })

  const lanes: CalEvent[][] = []
  const evtLane = new Map<string, number>()

  for (const evt of wEvts) {
    const es = parseDate(evt.start) < wStart ? wStart : parseDate(evt.start)
    const ee = parseDate(evt.end)   > wEnd   ? wEnd   : parseDate(evt.end)
    let placed = false
    for (let i = 0; i < lanes.length; i++) {
      const ok = !lanes[i].some(e => {
        const les = parseDate(e.start) < wStart ? wStart : parseDate(e.start)
        const lee = parseDate(e.end)   > wEnd   ? wEnd   : parseDate(e.end)
        return les <= ee && lee >= es
      })
      if (ok) { lanes[i].push(evt); evtLane.set(evt.id, i); placed = true; break }
    }
    if (!placed) { lanes.push([evt]); evtLane.set(evt.id, lanes.length - 1) }
  }

  // Build bar descriptors
  const bars = wEvts.map(evt => {
    const lane = evtLane.get(evt.id)!
    const evtStart = parseDate(evt.start)
    const evtEnd   = parseDate(evt.end)
    const before   = evtStart < wStart
    const after    = evtEnd   > wEnd
    const clipS    = before ? wStart : evtStart
    const clipE    = after  ? wEnd   : evtEnd
    return { evt, lane, startCol: clipS.getDay(), endCol: clipE.getDay(), span: clipE.getDay() - clipS.getDay() + 1, before, after }
  })

  // Overflow count per day
  const overflow = new Map<string, number>()
  for (const day of weekDays) {
    const ds = toYMD(day)
    const n  = wEvts.filter(e => e.start <= ds && e.end >= ds && (evtLane.get(e.id) ?? 0) >= MAX_LANES).length
    if (n > 0) overflow.set(ds, n)
  }

  const hasOverflow = overflow.size > 0
  const visLanes    = Math.min(lanes.length, MAX_LANES)
  const rowH        = DAY_NUM_H + visLanes * EVT_H + (hasOverflow ? OVERFLOW_H : 10)

  return { bars, overflow, rowH }
}

// ── Mini Calendar (for custom date picker) ───────────────────────────────────
function MiniCal({ year, month, selected, rangeStart, rangeEnd, onSelect }: {
  year: number; month: number
  selected: string | null
  rangeStart: string | null; rangeEnd: string | null
  onSelect: (d: string) => void
}) {
  const weeks = buildWeeks(year, month)
  const todayStr = toYMD(new Date())

  return (
    <div style={{ width: 220 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", padding: "4px 0" }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {week.map((day, di) => {
            const ds = toYMD(day)
            const inMonth = day.getMonth() + 1 === month
            const isToday = ds === todayStr
            const isSel   = ds === selected
            const inRange = rangeStart && rangeEnd && ds > rangeStart && ds < rangeEnd
            const isStart = ds === rangeStart
            const isEnd   = ds === rangeEnd
            return (
              <button key={di} onClick={() => onSelect(ds)} style={{
                background: (isSel || isStart || isEnd) ? "#3B82F6" : inRange ? "#DBEAFE" : "none",
                color: (isSel || isStart || isEnd) ? "#fff" : !inMonth ? "var(--muted-foreground)" : isToday ? "#3B82F6" : "var(--foreground)",
                border: "none", borderRadius: 4, padding: "5px 2px", fontSize: 12,
                fontWeight: (isSel || isStart || isEnd || isToday) ? 700 : 400,
                cursor: "pointer", textAlign: "center",
              }}>
                {day.getDate()}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Date range selector
  const [rangeLabel, setRangeLabel]   = useState("This Month")
  const [dropOpen,   setDropOpen]     = useState(false)
  const [customMode, setCustomMode]   = useState(false)
  const [pickerOpen, setPickerOpen]   = useState(false)
  const [customStart, setCustomStart] = useState<string|null>(null)
  const [customEnd,   setCustomEnd]   = useState<string|null>(null)
  const [pickStep, setPickStep]       = useState<"start"|"end">("start")
  const [pickerY, setPickerY] = useState(today.getFullYear())
  const [pickerM, setPickerM] = useState(today.getMonth() + 1)

  const dropRef   = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const todayStr  = toYMD(today)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month])

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current   && !dropRef.current.contains(e.target as Node))   setDropOpen(false)
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const prevMonth = () => { if (month === 1) { setYear(y => y-1); setMonth(12) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y+1); setMonth(1) } else setMonth(m => m+1) }

  const handleRangeOption = (opt: string) => {
    setDropOpen(false)
    setRangeLabel(opt)
    const now = new Date()
    if (opt === "This Week" || opt === "This Month") {
      setYear(now.getFullYear()); setMonth(now.getMonth() + 1); setCustomMode(false)
    } else if (opt === "Last Month") {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      setYear(d.getFullYear()); setMonth(d.getMonth() + 1); setCustomMode(false)
    } else if (opt === "Next Month") {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      setYear(d.getFullYear()); setMonth(d.getMonth() + 1); setCustomMode(false)
    } else if (opt === "Custom Dates") {
      setCustomMode(true)
      setCustomStart(null); setCustomEnd(null); setPickStep("start")
      setPickerY(now.getFullYear()); setPickerM(now.getMonth() + 1)
    }
  }

  const handlePickerDay = (ds: string) => {
    if (pickStep === "start") {
      setCustomStart(ds); setCustomEnd(null); setPickStep("end")
    } else {
      if (ds < (customStart ?? "")) {
        setCustomEnd(customStart); setCustomStart(ds)
      } else {
        setCustomEnd(ds)
      }
      setPickerOpen(false)
      const d = parseDate(ds < (customStart ?? ds) ? ds : (customStart ?? ds))
      setYear(d.getFullYear()); setMonth(d.getMonth() + 1)
    }
  }

  const prevPicker = () => { if (pickerM === 1) { setPickerY(y => y-1); setPickerM(12) } else setPickerM(m => m-1) }
  const nextPicker = () => { if (pickerM === 12) { setPickerY(y => y+1); setPickerM(1) } else setPickerM(m => m+1) }
  const pickerM2   = pickerM === 12 ? 1 : pickerM + 1
  const pickerY2   = pickerM === 12 ? pickerY + 1 : pickerY

  const dateRangeText = customMode && customStart
    ? customEnd
      ? `${SHORT_MONTHS[parseDate(customStart).getMonth()]} ${ordinal(parseDate(customStart).getDate())} ${parseDate(customStart).getFullYear()} - ${SHORT_MONTHS[parseDate(customEnd).getMonth()]} ${ordinal(parseDate(customEnd).getDate())} ${parseDate(customEnd).getFullYear()}`
      : `${SHORT_MONTHS[parseDate(customStart).getMonth()]} ${ordinal(parseDate(customStart).getDate())} ${parseDate(customStart).getFullYear()} - ...`
    : `${SHORT_MONTHS[month-1]} ${ordinal(1)} ${year} - ${SHORT_MONTHS[month-1]} ${ordinal(new Date(year, month, 0).getDate())} ${year}`

  const weeks = buildWeeks(year, month)

  // ── Legend ────────────────────────────────────────────────────────────────
  const legend = [
    { type: "leave",         label: "Leave" },
    { type: "leave_pending", label: "Pending Leave" },
    { type: "birthday",      label: "Birthday" },
    { type: "anniversary",   label: "Anniversary" },
    { type: "holiday",       label: "Public Holiday" },
    { type: "payday",        label: "Pay Day" },
  ]

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Calendar</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Leave schedule, birthdays, anniversaries and pay days</p>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        {/* Left: nav + range label */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: "50%", background: "#3B82F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ChevronLeft size={16} color="white" strokeWidth={2.5} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", minWidth: 220 }}>{dateRangeText}</span>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: "50%", background: "#3B82F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ChevronRight size={16} color="white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Right: range selector + custom date input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Custom date input */}
          {customMode && (
            <div ref={pickerRef} style={{ position: "relative" }}>
              <button onClick={() => { setPickerOpen(o => !o); setPickStep("start") }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", border: "1.5px solid #3B82F6", borderRadius: 8, background: "var(--background)", fontSize: 13, cursor: "pointer", color: "var(--foreground)", fontWeight: 500, whiteSpace: "nowrap" }}>
                <span style={{ color: customStart ? "var(--foreground)" : "var(--muted-foreground)" }}>{customStart ? `${SHORT_MONTHS[parseDate(customStart).getMonth()]} ${parseDate(customStart).getDate()}` : "Start Date"}</span>
                <span style={{ color: "var(--muted-foreground)"}}>→</span>
                <span style={{ color: customEnd ? "var(--foreground)" : "var(--muted-foreground)" }}>{customEnd ? `${SHORT_MONTHS[parseDate(customEnd).getMonth()]} ${parseDate(customEnd).getDate()}` : "End Date"}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </button>

              {pickerOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.14)", padding: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 10, fontWeight: 600 }}>
                    {pickStep === "start" ? "Select start date" : "Select end date"}
                  </div>
                  {/* Mini-cal nav */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button onClick={() => setPickerY(y => y - 1)} style={miniNavBtn}>«</button>
                      <button onClick={prevPicker} style={miniNavBtn}>‹</button>
                    </div>
                    <div style={{ display: "flex", gap: 32, fontSize: 13, fontWeight: 700 }}>
                      <span>{FULL_MONTHS[pickerM-1]} {pickerY}</span>
                      <span>{FULL_MONTHS[pickerM2-1]} {pickerY2}</span>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button onClick={nextPicker} style={miniNavBtn}>›</button>
                      <button onClick={() => setPickerY(y => y + 1)} style={miniNavBtn}>»</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 24 }}>
                    <MiniCal year={pickerY} month={pickerM} selected={pickStep === "start" ? customStart : customEnd} rangeStart={customStart} rangeEnd={customEnd} onSelect={handlePickerDay} />
                    <MiniCal year={pickerY2} month={pickerM2} selected={pickStep === "start" ? customStart : customEnd} rangeStart={customStart} rangeEnd={customEnd} onSelect={handlePickerDay} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Range dropdown */}
          <div ref={dropRef} style={{ position: "relative" }}>
            <button onClick={() => setDropOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", fontSize: 13, cursor: "pointer", color: "var(--foreground)", fontWeight: 500, minWidth: 150 }}>
              <span style={{ flex: 1, textAlign: "left" }}>{rangeLabel}</span>
              <ChevronRight size={14} style={{ transform: dropOpen ? "rotate(90deg)" : "rotate(0)", transition: "transform .15s" }} />
            </button>
            {dropOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: 160 }}>
                {["This Week","This Month","Last Month","Next Month","Custom Dates"].map(opt => (
                  <button key={opt} onClick={() => handleRangeOption(opt)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, background: opt === rangeLabel ? "var(--muted)" : "none", border: "none", cursor: "pointer", color: "var(--foreground)", fontWeight: opt === rangeLabel ? 700 : 400 }}
                    onMouseEnter={e => { if (opt !== rangeLabel) (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                    onMouseLeave={e => { if (opt !== rangeLabel) (e.currentTarget as HTMLElement).style.background = "none" }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────────── */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
        {/* Day header row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
          {WEEK_DAYS.map((d, i) => (
            <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? "#EF4444" : "var(--muted-foreground)", letterSpacing: "0.03em" }}>{d}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : (
          weeks.map((week, wi) => {
            const { bars, overflow, rowH } = layoutWeek(events, week)
            return (
              <div key={wi} style={{ position: "relative", height: rowH, display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: wi < weeks.length - 1 ? "1px solid var(--border)" : "none" }}>
                {/* Day cells */}
                {week.map((day, di) => {
                  const isToday     = toYMD(day) === todayStr
                  const inMonth     = day.getMonth() + 1 === month
                  const isSun       = di === 0
                  const ov          = overflow.get(toYMD(day)) ?? 0
                  return (
                    <div key={di} style={{ borderRight: di < 6 ? "1px solid var(--border)" : "none", padding: "5px 7px", position: "relative", height: "100%" }}>
                      {/* Day number */}
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 24, height: 24, borderRadius: "50%",
                        background: isToday ? "#3B82F6" : "transparent",
                        color: isToday ? "#fff" : !inMonth ? "var(--border)" : isSun ? "#EF4444" : "var(--foreground)",
                        fontSize: 13, fontWeight: isToday ? 800 : inMonth ? 500 : 400,
                      }}>
                        {day.getDate()}
                      </span>
                      {/* Overflow */}
                      {ov > 0 && (
                        <span style={{ position: "absolute", bottom: 4, left: 7, fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, cursor: "pointer" }}>
                          +{ov} more
                        </span>
                      )}
                    </div>
                  )
                })}

                {/* Event bars */}
                {bars
                  .filter(b => b.lane < MAX_LANES)
                  .map(b => {
                    const col = EVT_COLORS[b.evt.type] ?? { bg: "#94A3B8", text: "#fff" }
                    const leftPct  = (b.startCol / 7) * 100
                    const widthPct = (b.span / 7) * 100
                    return (
                      <div key={`${b.evt.id}-${wi}`} title={b.evt.title} style={{
                        position: "absolute",
                        left:   `calc(${leftPct}% + ${b.before ? 0 : 2}px)`,
                        width:  `calc(${widthPct}% - ${(b.before ? 0 : 2) + (b.after ? 0 : 2)}px)`,
                        top:    DAY_NUM_H + b.lane * EVT_H + EVT_GAP,
                        height: EVT_H - EVT_GAP * 2,
                        background: col.bg,
                        color: col.text,
                        borderRadius: `${b.before ? 0 : 4}px ${b.after ? 0 : 4}px ${b.after ? 0 : 4}px ${b.before ? 0 : 4}px`,
                        paddingLeft:  b.before ? 4 : 7,
                        paddingRight: b.after  ? 2 : 7,
                        fontSize: 11, fontWeight: 600,
                        display: "flex", alignItems: "center",
                        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                        zIndex: 1, cursor: "default",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                      }}>
                        {b.evt.title}
                        {b.after && <span style={{ marginLeft: "auto", paddingLeft: 4, opacity: 0.7, flexShrink: 0 }}>│</span>}
                      </div>
                    )
                  })}
              </div>
            )
          })
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14 }}>
        {legend.map(l => (
          <div key={l.type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: EVT_COLORS[l.type]?.bg ?? "#94A3B8", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const miniNavBtn: React.CSSProperties = {
  background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6,
  padding: "2px 7px", fontSize: 13, cursor: "pointer", color: "var(--foreground)", lineHeight: 1.5,
}
