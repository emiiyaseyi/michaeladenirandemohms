"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Info, Users, Building2 } from "lucide-react"

const NODE_W = 188
const NODE_H = 124
const H_GAP = 30
const V_GAP = 80

type Emp = {
  id: string
  firstName: string
  lastName: string
  jobTitle?: string | null
  profilePhoto?: string | null
  directReports: Emp[]
}

interface LNode {
  id: string
  emp: Emp
  x: number
  y: number
  cx: number
  width: number
  expanded: boolean
  children: LNode[]
}

function buildNode(emp: Emp, expanded: Set<string>): LNode {
  const isExpanded = expanded.has(emp.id) && (emp.directReports?.length ?? 0) > 0
  const children = isExpanded ? (emp.directReports ?? []).map(c => buildNode(c, expanded)) : []
  const childrenW = children.reduce((s, c) => s + c.width, 0) + H_GAP * Math.max(0, children.length - 1)
  return { id: emp.id, emp, x: 0, y: 0, cx: 0, width: Math.max(NODE_W, childrenW), expanded: isExpanded, children }
}

function placeNode(n: LNode, startX: number, y: number) {
  n.x = startX + (n.width - NODE_W) / 2
  n.y = y
  n.cx = startX + n.width / 2
  const childrenW = n.children.reduce((s, c) => s + c.width, 0) + H_GAP * Math.max(0, n.children.length - 1)
  let cx = startX + (n.width - childrenW) / 2
  for (const child of n.children) { placeNode(child, cx, y + NODE_H + V_GAP); cx += child.width + H_GAP }
}

function collectAll(n: LNode, nodes: LNode[], edges: Array<{ x1: number; y1: number; x2: number; y2: number }>) {
  nodes.push(n)
  for (const c of n.children) {
    edges.push({ x1: n.cx, y1: n.y + NODE_H, x2: c.cx, y2: c.y })
    collectAll(c, nodes, edges)
  }
}

function EmpAvatar({ name, photo, size = 42 }: { name: string; photo?: string | null; size?: number }) {
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#C8D5EA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="#8898AA">
        <path d="M12 12c2.67 0 4.8-2.13 4.8-4.8S14.67 2.4 12 2.4 7.2 4.53 7.2 7.2 9.33 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V21.6h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    </div>
  )
}

function BezierEdge({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mid = (y1 + y2) / 2
  return <path d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`} fill="none" stroke="#9CA3AF" strokeWidth={1.5} />
}

export default function OrgChartPage() {
  const [roots, setRoots] = useState<Emp[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"departments" | "tree">("departments")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [offset, setOffset] = useState({ x: 60, y: 30 })
  const [isDragging, setIsDragging] = useState(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const initialised = useRef(false)

  useEffect(() => {
    fetch("/api/org-chart").then(r => r.json()).then(d => {
      const r: Emp[] = d.roots ?? []
      setRoots(r)
      setDepartments(d.departments ?? [])
      const auto = new Set<string>()
      r.forEach(e => { if ((e.directReports?.length ?? 0) > 0) auto.add(e.id) })
      setExpanded(auto)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Centre chart on first load
  useEffect(() => {
    if (loading || initialised.current || !containerRef.current || roots.length === 0) return
    initialised.current = true
    const rootNodes = roots.map(r => buildNode(r, expanded))
    const totalW = rootNodes.reduce((s, r) => s + r.width, 0) + H_GAP * Math.max(0, rootNodes.length - 1)
    const containerW = containerRef.current.clientWidth
    setOffset({ x: Math.max(40, (containerW - totalW) / 2), y: 30 })
  }, [loading, roots, expanded])

  const toggle = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // Drag
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return
    setIsDragging(true)
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
  }, [isDragging])
  const onMouseUp = useCallback(() => setIsDragging(false), [])
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp) }
  }, [onMouseMove, onMouseUp])

  // Build layout
  const rootNodes = roots.map(r => buildNode(r, expanded))
  const totalW = Math.max(
    rootNodes.reduce((s, r) => s + r.width, 0) + H_GAP * Math.max(0, rootNodes.length - 1),
    220
  )

  const COMPANY_W = 200
  const COMPANY_H = 44
  const FIRST_Y = COMPANY_H + 64
  const companyCX = totalW / 2

  let rx = 0
  for (const rn of rootNodes) { placeNode(rn, rx, FIRST_Y); rx += rn.width + H_GAP }

  const allNodes: LNode[] = []
  const allEdges: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  rootNodes.forEach(rn => collectAll(rn, allNodes, allEdges))

  let maxY = FIRST_Y + NODE_H
  allNodes.forEach(n => { if (n.y + NODE_H > maxY) maxY = n.y + NODE_H })
  const canvasH = maxY + 60

  return (
    <div>
      {/* Header card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderBottom: "none", padding: "20px 24px", borderRadius: "12px 12px 0 0" }}>
        <h1 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Organisation Chart</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>View the organisation chart of your company</p>
      </div>

      {/* Tabs */}
      <div style={{ border: "1px solid var(--border)", borderTop: "none", borderBottom: "none", padding: "12px 20px", background: "var(--card)", display: "flex", gap: 4 }}>
        {(["departments", "tree"] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: view === t ? "var(--primary)" : "var(--muted)", color: view === t ? "white" : "var(--muted-foreground)" }}>
            {t === "departments" ? "Departments" : "Reporting Tree"}
          </button>
        ))}
      </div>

      {/* Departments view */}
      {view === "departments" && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "0 0 12px 12px", padding: 24, background: "var(--background)" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
          ) : departments.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Building2 size={32} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No departments yet. Create departments in Settings to build your org structure.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {departments.map((d: any) => (
                <div key={d.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Building2 size={18} style={{ color: "#6366F1" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div>
                      {d.division && <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{d.division.name}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Users size={13} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{d._count?.employees ?? 0} employee{(d._count?.employees ?? 0) !== 1 ? "s" : ""}</span>
                  </div>
                  {(d.employees ?? []).slice(0, 3).map((e: any) => (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <EmpAvatar name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto} size={26} />
                      <span style={{ fontSize: 12 }}>{e.firstName} {e.lastName}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reporting Tree (visual chart) */}
      {view === "tree" && <>
      {/* Info banner */}
      <div style={{ background: "#EEF2FF", border: "1px solid var(--border)", borderBottom: "none", padding: "12px 20px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Info size={15} style={{ color: "#6366F1", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
          People who neither have a manager nor reports won't show up here.<br />
          Hint: You can drag the chart to move around.
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        style={{
          border: "1px solid var(--border)", borderRadius: "0 0 12px 12px",
          background: "var(--background)", height: 540, overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab", userSelect: "none", position: "relative",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : roots.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
            <Users size={32} style={{ color: "var(--muted-foreground)" }} />
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No reporting structure yet. Assign managers to employees to build the org chart.</p>
          </div>
        ) : (
          <div style={{ position: "absolute", left: offset.x, top: offset.y, width: totalW }}>
            {/* SVG connectors */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: totalW, height: canvasH, overflow: "visible", pointerEvents: "none" }}>
              {/* Company → first level */}
              {rootNodes.map((rn, i) => (
                <BezierEdge key={`cr-${i}`} x1={companyCX} y1={COMPANY_H} x2={rn.cx} y2={rn.y} />
              ))}
              {/* Level to level */}
              {allEdges.map((e, i) => <BezierEdge key={`e-${i}`} {...e} />)}
            </svg>

            {/* Company node */}
            <div style={{
              position: "absolute", left: companyCX - COMPANY_W / 2, top: 0,
              width: COMPANY_W, height: COMPANY_H,
              background: "#6366F1", borderRadius: 8, zIndex: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 13, fontWeight: 700,
              boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
            }}>
              Data Science Nigeria
            </div>

            {/* Employee nodes */}
            {allNodes.map(n => (
              <div key={n.id} style={{
                position: "absolute", left: n.x, top: n.y,
                width: NODE_W, height: NODE_H,
                background: "#EBF0FA", borderRadius: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)", zIndex: 10,
                overflow: "hidden",
              }}>
                {/* Gold accent bar */}
                <div style={{ height: 4, background: "#F59E0B" }} />
                <div style={{ padding: "10px 12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <EmpAvatar name={`${n.emp.firstName} ${n.emp.lastName}`} photo={n.emp.profilePhoto} size={40} />
                  <div style={{ textAlign: "center", lineHeight: 1.35 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B" }}>{n.emp.firstName} {n.emp.lastName}</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 1 }}>{n.emp.jobTitle ?? "—"}</div>
                  </div>
                  <button
                    onClick={() => toggle(n.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "3px 10px",
                      background: "white", border: "1px solid #D1D5DB", borderRadius: 20,
                      fontSize: 11, cursor: "pointer", color: "#374151", fontWeight: 500,
                    }}>
                    <Users size={10} />
                    {n.emp.directReports?.length ?? 0} report{(n.emp.directReports?.length ?? 0) !== 1 ? "s" : ""}
                    <span style={{ fontSize: 9 }}>{n.expanded ? "▲" : "▼"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>}
    </div>
  )
}
