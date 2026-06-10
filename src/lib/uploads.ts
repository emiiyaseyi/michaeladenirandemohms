import { NextResponse } from "next/server"

export const UPLOADS_ENABLED = process.env.UPLOADS_ENABLED === "true"

export function uploadsDisabledResponse() {
  return NextResponse.json(
    { error: "File uploads are temporarily unavailable. Cloud storage is being configured." },
    { status: 503 }
  )
}
