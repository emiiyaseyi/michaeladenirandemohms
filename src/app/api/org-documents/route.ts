import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(_req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const documents = await prisma.$queryRaw`
    SELECT id, title, category, description, "fileUrl", "fileSize", "mimeType",
           "canView", "canDownload", "canCopy", "requiresAck", "isActive", "createdAt"
    FROM "OrgDocument"
    WHERE "isActive" = true
    ORDER BY title ASC
  `
  return NextResponse.json({ documents })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const body = await req.json()
  const { title, category = "OTHER", description, fileUrl, fileSize, mimeType, canView = true, canDownload = false, canCopy = true, requiresAck = false } = body

  if (!title?.trim() || !fileUrl?.trim()) {
    return NextResponse.json({ error: "Title and file URL are required" }, { status: 400 })
  }

  const [doc] = await prisma.$queryRaw`
    INSERT INTO "OrgDocument" (id, title, category, description, "fileUrl", "fileSize", "mimeType", "canView", "canDownload", "canCopy", "requiresAck", "isActive", "uploadedById", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      ${title.trim()},
      ${category}::"OrgDocCategory",
      ${description ?? null},
      ${fileUrl.trim()},
      ${fileSize ?? null},
      ${mimeType ?? null},
      ${canView},
      ${canDownload},
      ${canCopy},
      ${requiresAck},
      true,
      ${user.id},
      NOW(),
      NOW()
    )
    RETURNING id, title, category, "fileUrl", "isActive"
  ` as any[]

  await logAudit({
    req, actor: user, action: "ORG_DOC_CREATE", entity: "OrgDocument", entityId: doc.id,
    newValues: { title, category, canView, canDownload, canCopy, requiresAck },
  })

  return NextResponse.json({ document: doc }, { status: 201 })
}
