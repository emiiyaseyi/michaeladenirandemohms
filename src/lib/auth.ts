import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { ROLE_CAPABILITIES } from "@/lib/rbac"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { employee: { select: { id: true, profilePhoto: true } } },
        })
        if (!user || !user.password) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        // Track last login time (non-fatal)
        try { await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }) } catch {}
        let isElevated = false
        let permissions: Record<string, boolean> = {}
        if (user.role !== "SUPER_ADMIN") {
          const adminRoles = await prisma.userAdminRole.findMany({
            where: { userId: user.id },
            include: { adminRole: { select: { permissions: true } } },
          })
          isElevated = adminRoles.length > 0
          // Merge: any role granting a permission means the user has it
          for (const ur of adminRoles) {
            const perms = ur.adminRole.permissions as Record<string, boolean>
            for (const [key, val] of Object.entries(perms)) {
              if (val) permissions[key] = true
            }
          }
          // Merge system role capabilities (STAFF / PROJECT_LEAD base caps)
          const sysCaps = ROLE_CAPABILITIES[user.role as keyof typeof ROLE_CAPABILITIES]
          if (sysCaps) {
            for (const [key, val] of Object.entries(sysCaps)) {
              if (val === true) permissions[key] = true
            }
          }
        }
        return {
          id: user.id, email: user.email, name: user.name, role: user.role,
          employeeId: user.employee?.id, image: user.employee?.profilePhoto ?? user.image,
          lastLoginAt: new Date().toISOString(),
          mustChangePassword: user.mustChangePassword,
          isElevated,
          permissions,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.employeeId = (user as any).employeeId
        token.lastLoginAt = (user as any).lastLoginAt
        token.mustChangePassword = (user as any).mustChangePassword ?? false
        token.isElevated = (user as any).isElevated ?? false
        token.permissions = (user as any).permissions ?? {}
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).employeeId = token.employeeId
        ;(session.user as any).lastLoginAt = token.lastLoginAt
        ;(session.user as any).mustChangePassword = token.mustChangePassword ?? false
        ;(session.user as any).isElevated = token.isElevated ?? false
        ;(session.user as any).permissions = token.permissions ?? {}
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Re-export a server-side auth function for use in Server Components
export async function auth() {
  const { getServerSession } = await import("next-auth")
  return getServerSession(authOptions)
}
