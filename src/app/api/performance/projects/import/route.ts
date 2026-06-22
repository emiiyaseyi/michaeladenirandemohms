import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { parseCSV } from "@/lib/csv"
import { logAudit } from "@/lib/audit"

// Import projects (lead + team members) from a CSV. This is the source of truth for
// peer matching: peers are drawn from shared project membership first (see peerCandidatesOf).
// Columns: projectName, department, leadEmail, memberEmail
//   One row per (project, member). The lead is added as a member too.
async function employeeByEmail(email: string) {
  if (!email) return null
  return prisma.employee.findFirst({
    where: { user: { email: { equals: email.toLowerCase().trim(), mode: "insensitive" } } },
    select: { id: true, departmentId: true },
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canAssignReviewers")
  if (perm) return perm

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  const rows = parseCSV(await file.text())
  if (!rows.length) return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 })

  const headers = Object.keys(rows[0])
  for (const c of ["projectName", "leadEmail", "memberEmail"]) if (!headers.includes(c)) {
    return NextResponse.json({ error: `Missing required column "${c}". Expected: projectName, department, leadEmail, memberEmail.` }, { status: 400 })
  }

  let projectsCreated = 0, membersAdded = 0
  const skipped: { row: string; reason: string }[] = []
  const projectCache = new Map<string, string>() // projectName(lower) → projectId

  for (const r of rows) {
    const projectName = (r.projectName ?? "").trim()
    if (!projectName) continue
    const key = projectName.toLowerCase()

    // Resolve / create the project once.
    let projectId = projectCache.get(key)
    if (!projectId) {
      const lead = await employeeByEmail(r.leadEmail ?? "")
      if (!lead) { skipped.push({ row: projectName, reason: `lead "${r.leadEmail}" not found` }); continue }
      // Department: by name, else fall back to the lead's department.
      let departmentId: string | null = null
      if (r.department?.trim()) {
        const dept = await prisma.department.findFirst({ where: { name: { equals: r.department.trim(), mode: "insensitive" } }, select: { id: true } })
        departmentId = dept?.id ?? null
      }
      departmentId = departmentId ?? lead.departmentId
      if (!departmentId) { skipped.push({ row: projectName, reason: "no department (set department column or give the lead a department)" }); continue }

      const existing = await prisma.project.findFirst({ where: { name: { equals: projectName, mode: "insensitive" } }, select: { id: true } })
      if (existing) {
        projectId = existing.id
        await prisma.project.update({ where: { id: existing.id }, data: { leadId: lead.id, departmentId } })
      } else {
        const created = await prisma.project.create({ data: { name: projectName, leadId: lead.id, departmentId } })
        projectId = created.id
        projectsCreated++
      }
      projectCache.set(key, projectId)
      // Lead is a member of their own project.
      await prisma.projectMember.upsert({
        where: { projectId_employeeId: { projectId, employeeId: lead.id } },
        create: { projectId, employeeId: lead.id, projectRole: "LEAD" },
        update: {},
      })
    }

    // Add the member.
    const member = await employeeByEmail(r.memberEmail ?? "")
    if (!member) { if ((r.memberEmail ?? "").trim()) skipped.push({ row: `${projectName}/${r.memberEmail}`, reason: "member not found" }); continue }
    const res = await prisma.projectMember.upsert({
      where: { projectId_employeeId: { projectId, employeeId: member.id } },
      create: { projectId, employeeId: member.id, projectRole: "MEMBER" },
      update: {},
    })
    if (res) membersAdded++
  }

  await logAudit({ req, actor: user, action: "PROJECTS_IMPORT", entity: "Project", newValues: { projectsCreated, membersAdded, skipped: skipped.length } })
  return NextResponse.json({ ok: true, projectsCreated, membersAdded, skipped })
}
