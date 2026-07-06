import { ImageResponse } from "next/og"
import { getBranding } from "@/lib/branding"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default async function Icon() {
  const { logoUrl, primaryColor } = await getBranding()
  const absoluteLogoUrl = logoUrl
    ? `${process.env.NEXTAUTH_URL ?? ""}${logoUrl}`
    : null

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: primaryColor,
          borderRadius: 6,
        }}
      >
        {absoluteLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={absoluteLogoUrl} width={26} height={26} style={{ objectFit: "contain" }} />
        ) : (
          <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 20, fontFamily: "Arial, sans-serif" }}>M</span>
        )}
      </div>
    ),
    { ...size }
  )
}
