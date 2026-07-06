import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Static assets, auth API, and public routes - always pass through
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/onboard") ||
    pathname.startsWith("/api/onboard") ||
    pathname.startsWith("/api/test") ||
    pathname.startsWith("/api/branding")
  ) {
    return NextResponse.next()
  }

  // Change-password API must be reachable during first-login (before token is refreshed)
  if (pathname === "/api/auth/change-password") return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Public pages - redirect already-logged-in users away from /login
  if (pathname.startsWith("/login") || pathname.startsWith("/forgot-password")) {
    if (token && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", req.url))
    }
    return NextResponse.next()
  }

  // Everything else requires authentication
  if (!token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If mustChangePassword, only allow /first-login (and its API call above)
  if ((token as any).mustChangePassword && !pathname.startsWith("/first-login")) {
    return NextResponse.redirect(new URL("/first-login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$).*)",
  ],
}
