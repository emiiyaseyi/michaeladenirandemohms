import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const tasks = await prisma.onboardingTask.findMany({
    include: { employee: { select: { firstName: true, lastName: true, profilePhoto: true } } },
    orderBy: { createdAt: "desc" }
  })
  return NextResponse.json({ tasks })
}
