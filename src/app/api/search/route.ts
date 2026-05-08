import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function navItems(base: string) {
  const b = base.replace(/\/$/, "")
  const isAdmin = b === "/admin"
  const isProjectLead = b === "/project-lead"

  const items: { type: string; label: string; href: string; desc: string; keywords: string[] }[] = [
    { type: "nav", label: "Dashboard",        href: b,                              desc: "Overview & stats",                  keywords: ["home","overview","stats","summary","dashboard"] },
    { type: "nav", label: "Leave Requests",   href: `${b}/requests/leave`,          desc: "Leave requests & approvals",        keywords: ["leave","vacation","absence","time off","annual","sick"] },
    { type: "nav", label: "Performance",      href: `${b}/performance`,             desc: "KPIs, appraisals & cycles",         keywords: ["performance","kpi","appraisal","review","goals","feedback"] },
    { type: "nav", label: "Calendar",         href: `${b}/calendar`,                desc: "Events & schedule",                 keywords: ["calendar","schedule","events","dates"] },
    { type: "nav", label: "Announcements",    href: `${b}/announcements`,           desc: "Company announcements",             keywords: ["announcement","news","notice","update"] },
    { type: "nav", label: "My Profile",       href: `${b}/self-service/profile`,    desc: "Your employee profile",             keywords: ["profile","me","personal","info"] },
    { type: "nav", label: "My Payslips",      href: `${b}/self-service/payslips`,   desc: "View and download payslips",        keywords: ["payslip","salary","pay","slip"] },
    { type: "nav", label: "Edit Profile",     href: `${b}/self-service/edit`,       desc: "Update your personal information",  keywords: ["edit","update","change profile","personal"] },
  ]

  if (isAdmin || isProjectLead) {
    items.push(
      { type: "nav", label: "Teams",          href: `${b}/people/teams`,            desc: "Team management",                   keywords: ["team","group","squad"] },
      { type: "nav", label: "Org Chart",      href: `${b}/people/org-chart`,        desc: "Organisation hierarchy",            keywords: ["org","chart","hierarchy","structure","reporting"] },
    )
  }

  if (isAdmin) {
    items.push(
      { type: "nav", label: "Employees",      href: `${b}/people/employees`,        desc: "Manage all staff",                  keywords: ["staff","people","team","headcount","directory","employees"] },
      { type: "nav", label: "Departments",    href: `${b}/people/departments`,      desc: "Manage departments",                keywords: ["department","division","unit"] },
      { type: "nav", label: "Recruitment",    href: `${b}/recruitment`,             desc: "Job postings & candidate pipeline", keywords: ["recruitment","hiring","candidates","jobs","ats","interview"] },
      { type: "nav", label: "Profile Requests", href: `${b}/people/profile-requests`, desc: "Password & profile change requests", keywords: ["profile request","password reset","change request"] },
      { type: "nav", label: "Payroll",        href: `${b}/payroll/overview`,        desc: "Payroll overview & records",        keywords: ["payroll","salary","wages","pay run"] },
      { type: "nav", label: "Analytics",      href: `${b}/analytics`,               desc: "Charts, reports & insights",        keywords: ["analytics","reports","charts","insights","data","trends"] },
      { type: "nav", label: "Settings",       href: `${b}/settings`,                desc: "System configuration",              keywords: ["settings","config","setup","holidays"] },
    )
  }

  if (!isAdmin) {
    items.push(
      { type: "nav", label: "Documents",      href: `${b}/documents`,               desc: "Company documents & policies",      keywords: ["document","policy","sop","files"] },
      { type: "nav", label: "Projects",       href: `${b}/projects`,                desc: "Active projects",                   keywords: ["projects","work","assignments"] },
    )
  }

  return items
}

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

  const role = (session.user as any).role ?? "STAFF"
  const roleBase = role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin"
    : role === "PROJECT_LEAD" ? "/project-lead"
    : "/staff"

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 1) return NextResponse.json({ results: [] })

  const NAV_ITEMS = navItems(roleBase)

  const navResults = NAV_ITEMS
    .map(item => ({ ...item, score: score(item as any, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score: _, ...item }) => item)

  const [employees, leave, jobs, departments] = await Promise.all([
    prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName:  { contains: q, mode: "insensitive" } },
          { jobTitle:  { contains: q, mode: "insensitive" } },
          { user: { email: { contains: q, mode: "insensitive" } } },
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
          { title:      { contains: q, mode: "insensitive" } },
          { department: { name: { contains: q, mode: "insensitive" } } },
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

  const employeeBase = role === "ADMIN" || role === "SUPER_ADMIN"
    ? `${roleBase}/people/employees`
    : `${roleBase}/people/teams`

  const results: any[] = [
    ...employees.map(e => ({
      type: "employee",
      label: `${e.firstName} ${e.lastName}`,
      desc: `${e.jobTitle ?? "Staff"} · ${e.department?.name ?? ""}`,
      href: employeeBase,
      meta: e.employeeStatus,
      initials: `${e.firstName[0]}${e.lastName[0]}`.toUpperCase(),
    })),
    ...leave.map(l => ({
      type: "leave",
      label: `${l.employee.firstName} ${l.employee.lastName}`,
      desc: `${l.leaveType.name} · ${l.status}`,
      href: `${roleBase}/requests/leave`,
      meta: l.status,
    })),
    ...jobs.map(j => ({
      type: "job",
      label: j.title,
      desc: `${j.department?.name ?? ""} · ${j.employmentType ?? ""}`,
      href: role === "ADMIN" || role === "SUPER_ADMIN" ? `${roleBase}/recruitment/jobs` : `${roleBase}/job-pay`,
      meta: j.status,
    })),
    ...departments.map(d => ({
      type: "department",
      label: d.name,
      desc: "Department",
      href: role === "ADMIN" || role === "SUPER_ADMIN" ? `${roleBase}/people/departments` : `${roleBase}/people/org-chart`,
    })),
    ...navResults,
  ]

  const seen = new Set<string>()
  const deduped = results.filter(r => {
    const key = `${r.type}:${r.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ results: deduped.slice(0, 12) })
}
