import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
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
  return NextResponse.json({ job }, { status: 201 })
}
