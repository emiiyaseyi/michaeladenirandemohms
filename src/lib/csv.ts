// Minimal, dependency-free CSV parser. Handles quoted fields, commas inside quotes,
// CRLF line endings, and leading "#"-comment lines. Header row drives the keys.
// Mirrors the parser used by the employee CSV import.
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith("#"))
  if (lines.length < 2) return []
  const split = (line: string): string[] => {
    const values: string[] = []
    let cur = "", inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = "" }
      else cur += ch
    }
    values.push(cur.trim())
    return values.map(v => v.replace(/^"|"$/g, ""))
  }
  const headers = split(lines[0]).map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = split(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim() })
    return row
  })
}
