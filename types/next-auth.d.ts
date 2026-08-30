import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      adminId?: string | null
      adminRole?: string | null
      adminUsername?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    adminId?: string | null
    adminRole?: string | null
    adminUsername?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    adminId?: string | null
    adminRole?: string | null
    adminUsername?: string | null
  }
}
