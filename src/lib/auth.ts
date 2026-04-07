import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

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
        return { id: user.id, email: user.email, name: user.name, role: user.role, employeeId: user.employee?.id, image: user.employee?.profilePhoto ?? user.image }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.employeeId = (user as any).employeeId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).employeeId = token.employeeId
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
