import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Static navigation/feature items always available
const NAV_ITEMS = [
  { type: "nav", label: "Dashboard",            href: "/dashboard",    desc: "Overview & stats",                  keywords: ["home","overview","stats","summary"] },
  { type: "nav", label: "Employees",            href: "/employees",    desc: "Manage all staff",                  keywords: ["staff","people","team","headcount","directory"] },
  { type: "nav", label: "Leave Management",     href: "/leave",        desc: "Leave requests & approvals",        keywords: ["leave","vacation","absence","time off","annual","sick"] },
  { type: "nav", label: "Recruitment & ATS",    href: "/recruitment",  desc: "Job postings & candidate pipeline", keywords: ["recruitment","hiring","candidates","jobs","ats","interview"] },
  { type: "nav", label: "Performance",          href: "/performance",  desc: "KPIs, appraisals & cycles",         keywords: ["performance","kpi","appraisal","review","goals","feedback"] },
  { type: "nav", label: "Onboarding",           href: "/onboarding",   desc: "New hire tasks & checklist",        keywords: ["onboarding","new hire","checklist","induction"] },
  { type: "nav", label: "Offboarding",          href: "/offboarding",  desc: "Exit interviews & clearance",       keywords: ["offboarding","exit","resignation","termination","clearance"] },
  { type: "nav", label: "Org Chart",            href: "/org-chart",    desc: "Organisation hierarchy",            keywords: ["org","chart","hierarchy","structure","tree","reporting"] },
  { type: "nav", label: "Analytics",            href: "/analytics",    desc: "Charts, reports & insights",        keywords: ["analytics","reports","charts","insights","data","trends"] },
  { type: "nav", label: "Settings",             href: "/settings",     desc: "System configuration",              keywords: ["settings","config","setup","departments","leave types","holidays"] },
  { type: "nav", label: "Departments",          href: "/settings",     desc: "Manage departments",                keywords: ["department","division","team","unit"] },
  { type: "nav", label: "Leave Types",          href: "/settings",     desc: "Configure leave categories",        keywords: ["leave type","annual","sick","maternity","paternity","compassionate"] },
  { type: "nav", label: "Public Holidays",      href: "/settings",     desc: "Nigerian public holidays",          keywords: ["holiday","public","national","calendar"] },
  { type: "nav", label: "Apply for Leave",      href: "/leave",        desc: "Submit a new leave request",        keywords: ["apply leave","request leave","take leave"] },
  { type: "nav", label: "Add Employee",         href: "/employees",    desc: "Register a new employee",           keywords: ["add employee","new employee","hire","create staff"] },
  { type: "nav", label: "Post a Job",           href: "/recruitment",  desc: "Create a job posting",              keywords: ["post job","job opening","vacancy","position"] },
]

function score(item: { label: string; desc: string; keywords?: string[] }, q: string): number {
  const ql = q.toLowerCase()
  const words = ql.split(/\s+/).filter(Boolean)
  let s = 0
  const label = item.label.toLowerCase()
  const desc = (item.desc ?? "").toLowerCase()
  const kws = (item.keywords ?? []).join(" ").toLowerCase()

  if (label === ql) s += 100
  else if (label.startsWith(ql)) s += 60
  else if (label.includes(ql)) s += 40
  words.forEach(w => {
    if (label.includes(w)) s += 20
    if (desc.includes(w)) s += 10
    if (kws.includes(w)) s += 15
  })
  return s
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 1) return NextResponse.json({ results: [] })

  // Nav/feature search (always fast)
  const navResults = NAV_ITEMS
    .map(item => ({ ...item, score: score(item as any, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score: _, ...item }) => item)

  // DB searches in parallel
  const ql = q.toLowerCase()
  const [employees, leave, jobs, departments] = await Promise.all([
    prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName:  { contains: q, mode: "insensitive" } },
          { jobTitle:  { contains: q, mode: "insensitive" } },
          { workEmail: { contains: q, mode: "insensitive" } },
          { department: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { department: { select: { name: true } } },
      take: 5,
    }),
    prisma.leaveRequest.findMany({
      where: {
        OR: [
          { employee: { firstName: { contains: q, mode: "insensitive" } } },
          { employee: { lastName:  { contains: q, mode: "insensitive" } } },
          { leaveType: { name: { contains: q, mode: "insensitive" } } },
          { reason:   { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
      take: 3,
    }),
    prisma.jobPosting.findMany({
      where: {
        OR: [
          { title:       { contains: q, mode: "insensitive" } },
          { department:  { name: { contains: q, mode: "insensitive" } } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { department: { select: { name: true } } },
      take: 3,
    }),
    prisma.department.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 3,
    }),
  ])

  const results: any[] = [
    // People
    ...employees.map(e => ({
      type: "employee",
      label: `${e.firstName} ${e.lastName}`,
      desc: `${e.jobTitle ?? "Staff"} · ${e.department?.name ?? ""}`,
      href: `/employees`,
      meta: e.employeeStatus,
      initials: `${e.firstName[0]}${e.lastName[0]}`.toUpperCase(),
    })),
    // Leave requests
    ...leave.map(l => ({
      type: "leave",
      label: `${l.employee.firstName} ${l.employee.lastName}`,
      desc: `${l.leaveType.name} · ${l.status}`,
      href: `/leave`,
      meta: l.status,
    })),
    // Jobs
    ...jobs.map(j => ({
      type: "job",
      label: j.title,
      desc: `${j.department?.name ?? ""} · ${j.employmentType ?? ""}`,
      href: `/recruitment`,
      meta: j.status,
    })),
    // Departments
    ...departments.map(d => ({
      type: "department",
      label: d.name,
      desc: "Department",
      href: `/settings`,
    })),
    // Nav features
    ...navResults,
  ]

  // De-duplicate and limit
  const seen = new Set<string>()
  const deduped = results.filter(r => {
    const key = `${r.type}:${r.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ results: deduped.slice(0, 12) })
}
