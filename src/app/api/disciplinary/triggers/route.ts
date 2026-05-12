import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""

  const triggers = await prisma.disciplinaryTrigger.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(search ? {
        OR: [
          { action: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { employee: { firstName: { contains: search, mode: "insensitive" } } },
          { employee: { lastName: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ triggers })
}
