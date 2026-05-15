import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import bcrypt from "bcryptjs"

const TEMPLATE_CSV = `firstName,lastName,email,phone
John,Doe,john.doe@example.com,08012345678
Jane,Smith,jane.smith@example.com,`

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
  return lines.slice(1).map(line => {
    const values: string[] = []
    let cur = "", inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = "" }
      else cur += ch
    }
    values.push(cur.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? "" })
    return row
  })
}

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  return new NextResponse(TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="external_admins_template.csv"`,
    },
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length === 0) return NextResponse.json({ error: "File is empty or invalid" }, { status: 400 })

  const hashed = await bcrypt.hash(process.env.DEFAULT_USER_PASSWORD || "Welcome@DSN1", 10)

  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const firstName = row.firstName?.trim()
    const lastName = row.lastName?.trim()
    const email = row.email?.trim().toLowerCase()
    const phone = row.phone?.trim()

    if (!email || !firstName || !lastName) { skipped++; continue }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) { skipped++; errors.push(`${email}: already exists`); continue }

    try {
      await prisma.user.create({
        data: {
          name: `${firstName} ${lastName}`.trim(),
          email,
          password: hashed,
          role: "STAFF",
          mustChangePassword: true,
          ...(phone ? { employee: { create: { employeeId: `EXT-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, firstName, lastName, phone, employeeStatus: "ACTIVE", employmentType: "FULL_TIME" } } } : {}),
        },
      })
      created++
    } catch {
      skipped++
      errors.push(`${email}: failed to create`)
    }
  }

  return NextResponse.json({ created, skipped, errors })
}
