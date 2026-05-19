import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageRecruitment) return forbidden()
  const { title, departmentId, description, employmentType, isInternal } = await req.json()
  if (!title || !description) return NextResponse.json({ error: "Title and description required" }, { status: 400 })

  const job = await prisma.jobPosting.create({
    data: {
      title, description,
      departmentId: departmentId || null,
      employmentType: (employmentType ?? "FULL_TIME") as any,
      isInternal: isInternal ?? false,
      status: "OPEN",
      openDate: new Date(),
    }
  })

  await logAudit({
    req, actor: user, action: "JOB_CREATE", entity: "JobPosting", entityId: job.id,
    newValues: { title, departmentId, employmentType, isInternal },
  })

  return NextResponse.json({ job }, { status: 201 })
}
