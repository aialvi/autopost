import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_USER_ID, isDemoEnabled } from "@/lib/demo/config";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "./password";
import { loginSchema } from "./utils";
import { getProviders } from "./providers";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const validatedFields = loginSchema.safeParse(credentials);

          if (!validatedFields.success) {
            return null;
          }

          const { email, password } = validatedFields.data;
          if (email.toLowerCase() === DEMO_EMAIL) {
            if (!isDemoEnabled() || password !== DEMO_PASSWORD) return null;
            return { id: DEMO_USER_ID, email: DEMO_EMAIL, name: "Demo visitor", role: "operator" };
          }

          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user || !user.passwordHash) {
            return null;
          }

          const isValid = await verifyPassword(password, user.passwordHash);

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
    ...Object.values(getProviders()),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = typeof token.role === "string" ? token.role : "operator";
      }
      return session;
    },
    async signIn({ user, account }) {
      // The public demo identity can only be issued by the credentials provider.
      if (account?.provider !== "credentials" && user?.email?.toLowerCase() === DEMO_EMAIL) return false;
      // For OAuth, check if user exists, create if not
      if (account?.provider !== "credentials" && user?.email) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });

        if (!existingUser) {
          // Create new user from OAuth - the user will be created with defaults
          await db.insert(users).values({
            email: user.email,
            name: user.name,
            image: user.image,
            role: "operator",
          });
        } else {
          // Update user object with existing user data
          user.id = existingUser.id;
          user.role = existingUser.role;
        }
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      console.log("New user created:", user.email);
    },
  },
});
