import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const payments = await prisma.contractorPayment.findMany({
    where: { contractorId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ payments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const payment = await prisma.contractorPayment.create({
    data: {
      contractorId: id,
      description: body.description || null,
      amount: body.amount,
      bank: body.bank || null,
      status: body.status || "PENDING",
    },
  })

  return NextResponse.json({ payment }, { status: 201 })
}
