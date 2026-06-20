import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        // ========== DEMO LOGIN ==========
        if (email === "demo@wandr.com" && password === "demo1234") {
          let demoUser = await prisma.user.findUnique({
            where: { email: "demo@wandr.com" },
          });
          if (!demoUser) {
            demoUser = await prisma.user.create({
              data: {
                email: "demo@wandr.com",
                name: "Demo Traveler",
                password: await bcrypt.hash("demo1234", 12),
              },
            });
          }
          return demoUser;
        }

        // ========== NORMAL LOGIN ==========
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
          throw new Error("No account found with this email");
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          throw new Error("Incorrect password");
        }
        return user;
      },
    }),
    // Google Provider REMOVED — no billing required
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});
