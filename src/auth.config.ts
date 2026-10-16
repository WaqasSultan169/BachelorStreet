import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { AUTH } from "@/lib/constants";

/**
 * Edge-safe Auth.js configuration. No database imports here — this module is
 * imported by src/proxy.ts where heavy server code must not run. The full
 * instance (src/auth.ts) composes this with the Credentials provider and the
 * DB-backed JWT/session callbacks.
 */

// Only offer Google when it is actually configured; we never expose a sign-in
// option that would immediately fail. process.env is statically inlined for
// the edge bundle by Next.js, so this stays edge-safe.
const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: AUTH.sessionMaxAgeSeconds,
  },
  providers: googleConfigured
    ? [
        Google({
          // We deliberately do NOT enable dangerous email account linking. If a
          // Google email matches an existing password account we stop the
          // sign-in and ask the user to verify ownership with their password.
          allowDangerousEmailAccountLinking: false,
        }),
      ]
    : [],
  callbacks: {
    // Coarse gating is handled by src/proxy.ts; no op here so this config
    // stays purely declarative and edge-safe.
    authorized: () => true,
  },
} satisfies NextAuthConfig;
