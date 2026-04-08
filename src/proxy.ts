import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { canAccessRoute } from "@/lib/rbac"

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public paths — skip auth check
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as string

  // Check dashboard page access
  if (pathname.startsWith("/") && !pathname.startsWith("/api/")) {
    if (!canAccessRoute(role, pathname)) {
      // Redirect to dashboard with access-denied flag
      const url = new URL("/dashboard", req.url)
      url.searchParams.set("denied", "1")
      return NextResponse.redirect(url)
    }
  }

  // API route protection — role check happens inside each route handler
  // (middleware only ensures authentication for all /api/* except /api/auth/*)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
