import { Role } from "@prisma/client"
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      isIntern: boolean
    } & DefaultSession["user"]
  }

  interface User {
    role: Role
    isIntern: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role
    id: string
    isIntern: boolean
  }
}
