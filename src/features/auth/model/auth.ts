import PostgresAdapter from "@auth/pg-adapter";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { accountExists, setPasswordHash } from "@/features/auth/model/accounts";
import { googleEnabled, signUpAllowed } from "@/features/auth/model/authConfig";
import { verifyPasskeyLogin } from "@/features/auth/model/passkeys";
import { hashPassword, needsRehash, verifyPassword } from "@/features/auth/model/password";
import { sessionState } from "@/features/auth/model/sessions";
import { noteSignIn } from "@/features/auth/model/signIns";
import { twoFactorEnabled, verifySecondFactor } from "@/features/auth/model/twoFactor";
import { ensureSchema, getPool } from "@/shared/api/db";
import { readText } from "@/shared/lib/guards";
import { clientKey, rateLimit } from "@/shared/lib/rateLimit";

// A sign-in that needs the code from the authenticator app
class SecondFactorRequired extends CredentialsSignin {
  code = "two_factor";
}

// A sign-in with a wrong code
class SecondFactorWrong extends CredentialsSignin {
  code = "two_factor_wrong";
}

declare module "next-auth" {
  interface Session {
    signInId?: string;
  }
}

// Accounts and Google links live in Postgres; a build without a database skips it
const adapter = process.env.DATABASE_URL ? { adapter: PostgresAdapter(getPool()) } : {};

// The text a sign-in form sent for a field, empty when it sent none
const field = (raw: unknown, key: string): string => readText(raw, key) ?? "";

// The account that just signed in; Auth.js passes it then, despite its types
const signedInId = (user: { id?: string } | undefined): string | undefined => user?.id;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...adapter,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: { email: {}, password: {}, code: {} },
      // An account by email and password, asking for a code when it has 2FA
      async authorize(raw, request) {
        const email = field(raw, "email").trim().toLowerCase();
        const password = field(raw, "password");
        if (!email || !password) return null;
        const limit = rateLimit(clientKey(request, `signin:${email}`), 10, 15 * 60_000);
        if (!limit.allowed || !rateLimit(`signin-account:${email}`, 30, 15 * 60_000).allowed) return null;
        await ensureSchema();
        const res = await getPool().query<{
          id: string;
          email: string | null;
          name: string | null;
          image: string | null;
          password_hash: string | null;
        }>(`SELECT id, email, name, image, password_hash FROM users WHERE lower(email) = $1`, [email]);
        const user = res.rows[0];
        const stored = user?.password_hash ?? "scrypt$00$" + "0".repeat(128);
        const ok = await verifyPassword(password, stored);
        if (!ok || !user?.password_hash) return null;
        if (needsRehash(user.password_hash)) {
          const upgraded = await hashPassword(password);
          await setPasswordHash(user.id, upgraded);
        }
        if (await twoFactorEnabled(user.id)) {
          const code = field(raw, "code").trim();
          if (!code) throw new SecondFactorRequired();
          if (!(await verifySecondFactor(user.id, code))) throw new SecondFactorWrong();
        }
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: { response: {} },
      // An account by a verified passkey sign-in
      async authorize(raw, request) {
        if (!rateLimit(clientKey(request, "passkey"), 20, 15 * 60_000).allowed) return null;
        try {
          const response: unknown = JSON.parse(field(raw, "response"));
          return await verifyPasskeyLogin(response);
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // Lets Google in for an account that exists or an address that may sign up
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const email = (profile?.email ?? user.email ?? "").trim().toLowerCase();
      if (email === "" || profile?.email_verified === false) return false;
      return signUpAllowed(email) || (await accountExists(email));
    },
    // Stamps a new token with its account, epoch and sign-in; drops outdated ones
    async jwt({ token, user, account }) {
      const id = signedInId(user);
      if (id) {
        token.sub = id;
        token.epoch = (await sessionState(id))?.epoch ?? 0;
        const method =
          account?.provider === "google" ? "google" : account?.provider === "passkey" ? "passkey" : "password";
        token.signInId = await noteSignIn(id, method);
        return token;
      }
      if (!token.sub) return token;
      const current = await sessionState(token.sub);
      if (!current) return null;
      if (current.epoch === (Number(token.epoch) || 0)) return token;
      // The session that signed the others out carries on under the new epoch
      return current.keeper !== null && token.signInId === current.keeper ? { ...token, epoch: current.epoch } : null;
    },
    // Puts the account id and sign-in record on the session
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (typeof token.signInId === "string") session.signInId = token.signInId;
      return session;
    },
  },
});
