import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { sendEmail } from "@/lib/email"
import { logAudit } from "@/lib/audit"

const REQUIRED_COLS = ["firstName", "lastName", "email", "accessLevel"]
const ALL_COLS = REQUIRED_COLS

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith("#"))
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
  return lines.slice(1).map(line => {
    const values: string[] = []
    let cur = "", inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') inQuote = !inQuote
      else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = "" }
      else cur += ch
    }
    values.push(cur.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? "" })
    return row
  })
}

// GET: download CSV template — lists available role slugs in comments
export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const roles = await prisma.adminRole.findMany({
    select: { slug: true, name: true, isSystem: true },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  })

  const slugList = roles.map(r => `  ${r.slug} - ${r.name}${r.isSystem ? " (system)" : ""}`).join("\n")

  const headers = ALL_COLS
  const examples = [
    ["Jane", "Doe", "jane.doe@example.com", "full"],
    ["John", "Smith", "john.smith@example.com", "hr-admin,leave-admin"],
  ]
  const notes = [
    "# External Admin bulk upload template.",
    "# Required: firstName, lastName, email, accessLevel",
    "# accessLevel values:",
    "#   'full' = Secondary Admin (full admin panel access)",
    "#   or a comma-separated list of role slugs for limited access (e.g. hr-admin,leave-admin)",
    "# Available role slugs:",
    slugList,
    "# A welcome email with the temp password is sent to each created admin.",
    "# Duplicate emails are skipped (existing user accounts are not modified).",
  ]
  const csv = [
    notes.join("\n"),
    headers.join(","),
    ...examples.map(r => r.join(",")),
  ].join("\n")

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="external_admins_template.csv"',
    },
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (!rows.length) return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 })

  // Level 1: structural validation
  const headers = Object.keys(rows[0])
  for (const col of REQUIRED_COLS) {
    if (!headers.includes(col)) {
      return NextResponse.json({ error: `Missing required column "${col}". Required: ${REQUIRED_COLS.join(", ")}` }, { status: 400 })
    }
  }
  const unknownCols = headers.filter(h => !ALL_COLS.includes(h))
  if (unknownCols.length) {
    return NextResponse.json({ error: `Unknown column(s): ${unknownCols.map(c => `"${c}"`).join(", ")}. Allowed: ${ALL_COLS.join(", ")}` }, { status: 400 })
  }

  // Pre-fetch all admin roles for slug → id lookup
  const allRoles = await prisma.adminRole.findMany({ select: { id: true, slug: true } })
  const slugToId = new Map(allRoles.map(r => [r.slug, r.id]))
  const secondaryAdminId = slugToId.get("secondary-admin")

  // Level 2: row-by-row validation
  const results: { row: number; status: "created" | "skipped"; email?: string; error?: string }[] = []
  const loginUrl = `${process.env.NEXTAUTH_URL}/login`

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2
    const firstName = row.firstName?.trim()
    const lastName = row.lastName?.trim()
    const email = row.email?.trim().toLowerCase()
    const accessLevelRaw = row.accessLevel?.trim() ?? ""

    if (!firstName || !lastName || !email || !accessLevelRaw) {
      results.push({ row: rowNum, status: "skipped", email, error: "Missing required field(s)" })
      continue
    }
    if (!email.includes("@")) {
      results.push({ row: rowNum, status: "skipped", email, error: "Invalid email" }); continue
    }

    // Resolve accessLevel → adminRole IDs
    let roleIds: string[]
    if (accessLevelRaw.toLowerCase() === "full") {
      if (!secondaryAdminId) {
        results.push({ row: rowNum, status: "skipped", email, error: "secondary-admin role not configured" }); continue
      }
      roleIds = [secondaryAdminId]
    } else {
      const slugs = accessLevelRaw.split(",").map(s => s.trim()).filter(Boolean)
      const ids: string[] = []
      let bad = ""
      for (const slug of slugs) {
        const id = slugToId.get(slug)
        if (!id) { bad = slug; break }
        ids.push(id)
      }
      if (bad) {
        results.push({ row: rowNum, status: "skipped", email, error: `Unknown role slug "${bad}"` }); continue
      }
      if (ids.length === 0) {
        results.push({ row: rowNum, status: "skipped", email, error: "No valid roles resolved from accessLevel" }); continue
      }
      roleIds = ids
    }

    // Duplicate email check
    const existing = await prisma.user.findFirst({ where: { email } })
    if (existing) {
      results.push({ row: rowNum, status: "skipped", email, error: "Email already exists" }); continue
    }

    try {
      const tempPassword = Math.random().toString(36).slice(-10) + "A1!"
      const hashed = await bcrypt.hash(tempPassword, 12)
      const newUser = await prisma.user.create({
        data: {
          name: `${firstName} ${lastName}`.trim(),
          email,
          password: hashed,
          role: "STAFF" as any,
          mustChangePassword: true,
          adminRoles: { create: roleIds.map(rid => ({ adminRoleId: rid })) },
        },
      })

      sendEmail({
        eventKey: "external_admin_welcome",
        to: email,
        variables: { name: newUser.name ?? "", tempPassword, loginUrl },
      }).catch(() => {})

      await logAudit({
        req, actor: user, action: "EXTERNAL_ADMIN_CREATE", entity: "User", entityId: newUser.id,
        targetUserId: newUser.id,
        newValues: { name: newUser.name, email: newUser.email, roleIds, bulk: true },
      })

      results.push({ row: rowNum, status: "created", email })
    } catch (e: any) {
      results.push({ row: rowNum, status: "skipped", email, error: e.message ?? "Unknown error" })
    }
  }

  const created = results.filter(r => r.status === "created").length
  const skipped = results.filter(r => r.status === "skipped").length
  return NextResponse.json({ created, skipped, results })
}
