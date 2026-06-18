"use client"
import React from "react"

// Rating scale guidance shown above each rating section.
//  - 0–5 scale: behavioural (Section II) + peer review
//  - 0–3 scale: organisation core values (Section IV)
export function scaleHint(scaleMax: number): string {
  if (scaleMax >= 5) return "0 = Unacceptable  ·  1–2 = Needs Improvement  ·  3–4 = Meets expectation  ·  5 = Exceeds expectation"
  if (scaleMax === 3) return "0 = Unacceptable  ·  1 = Needs Improvement  ·  2 = Meets Expectations  ·  3 = Exceeds Expectations"
  return `Rate on a scale of 0 to ${scaleMax}`
}

export function ScaleLegend({ scaleMax }: { scaleMax: number }) {
  return (
    <div style={{ fontSize: 12, color: "var(--muted-foreground)", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, lineHeight: 1.5 }}>
      <strong style={{ color: "var(--foreground)" }}>Scale (0–{scaleMax}): </strong>{scaleHint(scaleMax)}
    </div>
  )
}

// Comments are mandatory. Returns an error string if any rated question is missing
// a score or a (non-empty) comment, else null.
export function validateRatings(
  rows: { score: number | null | undefined; comment: string | null | undefined }[],
): string | null {
  for (const r of rows) {
    if (r.score === null || r.score === undefined) return "Give every item a score."
    if (!r.comment || !r.comment.trim()) return "A comment is required for every item."
  }
  return null
}
