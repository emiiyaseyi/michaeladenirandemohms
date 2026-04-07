import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { name, date, year } = await req.json()
  if (!name || !date) return NextResponse.json({ error: "Name and date required" }, { status: 400 })
  const d = new Date(date)
  const h = await prisma.publicHoliday.create({ data: { name, date: d, year: d.getFullYear() } })
  return NextResponse.json({ h }, { status: 201 })
}
