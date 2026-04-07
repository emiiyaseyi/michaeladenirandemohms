import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { name, description, defaultDays, waitingDays, genderSpecific, requiresDoc, minDocDays } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const lt = await prisma.leaveType.create({
    data: { name, description: description||null, defaultDays: Number(defaultDays??21), waitingDays: Number(waitingDays??0), genderSpecific: genderSpecific||null, requiresDoc: requiresDoc??false, minDocDays: Number(minDocDays??2) }
  })
  return NextResponse.json({ lt }, { status: 201 })
}
