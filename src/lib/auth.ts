import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
        name: "Test Login",
        credentials: {
          email: { label: "Email", type: "text" },
          role: { label: "Role", type: "text" }
        },
        async authorize(credentials) {
          console.log("AUTHORIZE HIT with credentials:", credentials);
          if (!credentials?.email) {
            console.log("No email provided");
            return null;
          }
          
          let admin = await prisma.admin.findUnique({ where: { email: credentials.email } });
          console.log("Found admin:", admin ? admin.email : "none");
          if (!admin) {
            admin = await prisma.admin.create({
              data: {
                email: credentials.email,
                name: "Test Admin",
                role: (credentials.role as any) || "SUPER_ADMIN",
                password: "TEST_ONLY"
              }
            });
          }

          return {
            id: admin.id,
            name: admin.name,
            email: admin.email,
          };
        }
      })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        
        // Check if this email exists in the Admin table
        if (user.email) {
          const admin = await prisma.admin.findUnique({
            where: { email: user.email }
          });
          token.isAdmin = !!admin;
          token.adminRole = admin ? admin.role : null;
          token.adminId = admin ? admin.id : null;
        } else {
          token.isAdmin = false;
          token.adminRole = null;
          token.adminId = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // @ts-ignore
        session.user.id = token.sub;
        // @ts-ignore
        session.user.isAdmin = token.isAdmin;
        // @ts-ignore
        session.user.adminRole = token.adminRole;
        // @ts-ignore
        session.user.adminId = token.adminId;
      }
      return session;
    },
  },
  debug: true,
};
