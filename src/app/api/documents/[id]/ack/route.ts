import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const emp = await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } })
  if (!emp) return NextResponse.json({ error: "Employee record not found" }, { status: 404 })

  const doc = await prisma.orgDocument.findUnique({ where: { id } })
  if (!doc || !doc.isActive) return NextResponse.json({ error: "Document not found" }, { status: 404 })

  const contentType = req.headers.get("content-type") ?? ""
  let signatureUrl: string | null = null

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const sigFile = formData.get("signature") as File | null
    if (sigFile) {
      const bytes = await sigFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const ext = sigFile.name.split(".").pop()?.toLowerCase() ?? "png"
      const filename = `sig_${id.slice(-6)}_${emp.id.slice(-6)}_${Date.now()}.${ext}`
      const dir = path.join(process.cwd(), "public", "uploads", "signatures")
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, filename), buffer)
      signatureUrl = `/uploads/signatures/${filename}`
    }
  }

  const ack = await prisma.docAck.upsert({
    where: { documentId_employeeId: { documentId: id, employeeId: emp.id } },
    update: { acknowledged: true, acknowledgedAt: new Date(), ...(signatureUrl && { signatureUrl }) },
    create: {
      documentId: id,
      employeeId: emp.id,
      acknowledged: true,
      acknowledgedAt: new Date(),
      signatureUrl,
    },
  })

  return NextResponse.json({ ack })
}
