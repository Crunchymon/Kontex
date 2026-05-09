import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { users } from "@kontex/shared/schema";
import { db } from "./db";
import { createSessionApiKey, revokeApiKey } from "./api-keys";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
    apiKey: string;
    apiKeyId: string;
  }
}

type KontexToken = {
  userId?: string;
  apiKey?: string;
  apiKeyId?: string;
} & Record<string, unknown>;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { prompt: "consent" } }
    })
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const [existing] = await db().select().from(users).where(eq(users.email, user.email)).limit(1);
      if (!existing) {
        await db()
          .insert(users)
          .values({
            email: user.email,
            name: user.name ?? user.email
          });
      }
      return true;
    },
    async jwt({ token, user }) {
      const t = token as KontexToken;
      if (user?.email) {
        const [row] = await db().select().from(users).where(eq(users.email, user.email)).limit(1);
        if (row) {
          t.userId = row.id;
          const session = await createSessionApiKey(row.id);
          t.apiKey = session.rawKey;
          t.apiKeyId = session.id;
        }
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as KontexToken;
      if (t.userId) {
        session.user = { ...session.user, id: t.userId };
      }
      session.apiKey = t.apiKey ?? "";
      session.apiKeyId = t.apiKeyId ?? "";
      return session;
    }
  },
  events: {
    async signOut(message) {
      const apiKeyId =
        message && typeof message === "object" && "token" in message && message.token
          ? (message.token as { apiKeyId?: string }).apiKeyId
          : undefined;
      if (apiKeyId) {
        await revokeApiKey(apiKeyId).catch(() => undefined);
      }
    }
  }
});
