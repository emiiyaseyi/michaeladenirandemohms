"use client"
import React from "react"

// One rater's row for a question: who, their score, their comment, and whether the
// current viewer may edit it.
export interface RaterRow {
  raterType: "SELF" | "PRIMARY_REVIEWER" | "COUNTER_REVIEWER" | "ADMIN"
  label: string                 // "Employee", "Team Lead", "Reviewer 2", "Admin"
  score: number | null
  comment: string | null
  editable: boolean
}

const labelCol: React.CSSProperties = { width: 110, fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap", paddingTop: 8 }
const cellInput: React.CSSProperties = { padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }

// A question with its raters stacked on top of one another. Score is a 0..scaleMax
// selector; the comment box takes the remaining (wider) space. Non-editable rows render
// read-only. `onChange` fires for the viewer's editable row.
export function StackedRatings({
  questionText, scaleMax, rows, onChange, mode = "select",
}: {
  questionText: string
  scaleMax: number                // for "select" the top button; for "number" the max (e.g. KPI weight)
  rows: RaterRow[]
  onChange: (raterType: RaterRow["raterType"], patch: { score?: number | null; comment?: string }) => void
  mode?: "select" | "number"      // "number" = free score 0..scaleMax (e.g. KPI out of its weight)
}) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{questionText}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row, idx) => (
          <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={labelCol}>{row.label}</div>
            {/* Score — single row, never wraps */}
            <div style={{ flex: "0 0 auto" }}>
              {row.editable ? (
                mode === "number" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" min={0} max={scaleMax} value={row.score ?? ""}
                      onChange={e => onChange(row.raterType, { score: e.target.value === "" ? null : Math.max(0, Math.min(scaleMax, Number(e.target.value))) })}
                      style={{ ...cellInput, width: 70, textAlign: "center" }} />
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>/ {scaleMax}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
                    {Array.from({ length: scaleMax + 1 }, (_, n) => {
                      const active = row.score === n
                      return (
                        <button key={n} type="button" onClick={() => onChange(row.raterType, { score: n })}
                          style={{ width: 30, padding: "6px 0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, flex: "0 0 auto",
                            border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                            background: active ? "var(--primary)" : "var(--background)", color: active ? "white" : "var(--foreground)" }}>
                          {n}
                        </button>
                      )
                    })}
                  </div>
                )
              ) : (
                <div style={{ fontSize: 14, fontWeight: 800, paddingTop: 6, width: 64 }}>{row.score ?? "—"}<span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}> / {scaleMax}</span></div>
              )}
            </div>
            {/* Comment — takes the remaining (wider) space; extendable */}
            <div style={{ flex: 1, minWidth: 160 }}>
              {row.editable ? (
                <textarea value={row.comment ?? ""} placeholder="Comment (required)" rows={2}
                  onChange={e => onChange(row.raterType, { comment: e.target.value })} style={{ ...cellInput, width: "100%", resize: "vertical", minHeight: 38 }} />
              ) : (
                <div style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap", paddingTop: 6 }}>{row.comment || "—"}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
