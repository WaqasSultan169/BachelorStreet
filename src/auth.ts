import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { connectDb } from "@/server/db";
import { getUserModel } from "@/server/db/models";
import {
  needsRehash,
  verifyPassword,
  verifyPasswordDummy,
} from "@/server/auth/password";
import { loginSchema } from "@/server/validation";
import {
  AccountLinkRequiredError,
  recordLogin,
  resolveGoogleUser,
  upgradePasswordHash,
} from "@/server/services/auth.service";
import { enforceRateLimit } from "@/server/rate-limit";
import { RateLimitError } from "@/lib/errors";
import type { Role } from "@/lib/constants";
import { logger } from "@/lib/logger";

/** Sign-in failures that map to a specific, safe message on the login page. */
class UnverifiedEmailSignin extends CredentialsSignin {
  code = "email_not_verified";
}
class InactiveAccountSignin extends CredentialsSignin {
  code = "account_inactive";
}
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

type CredentialsUser = {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: Role;
  tokenVersion: number;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<CredentialsUser | null> {
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
        });
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();

        // Cover both the server action and a direct POST to the callback route.
        try {
          await enforceRateLimit("login", parsed.data.email);
        } catch (error) {
          if (error instanceof RateLimitError) throw new RateLimitedSignin();
          throw error;
        }

        await connectDb();
        const User = getUserModel();
        const user = await User.findOne({ normalizedEmail: email })
          .select("+passwordHash")
          .lean<{
            _id: { toString(): string };
            email: string;
            name: string;
            image?: string | null;
            role: Role;
            passwordHash?: string;
            emailVerified?: Date | null;
            isActive: boolean;
            tokenVersion?: number;
          } | null>();

        // Spend comparable time so a missing account isn't distinguishable
        // from a wrong password by response timing.
        if (!user?.passwordHash) {
          await verifyPasswordDummy();
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        if (!user.isActive) throw new InactiveAccountSignin();
        if (!user.emailVerified) throw new UnverifiedEmailSignin();

        if (needsRehash(user.passwordHash)) {
          try {
            await upgradePasswordHash(user._id.toString(), parsed.data.password);
          } catch (error) {
            logger.error("Failed to upgrade password hash", error);
          }
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image ?? undefined,
          role: user.role,
          tokenVersion: user.tokenVersion ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      try {
        await resolveGoogleUser({
          email: user.email ?? "",
          name: user.name ?? "Google user",
          image: user.image ?? undefined,
          providerVerified: Boolean(
            (profile as { email_verified?: boolean } | undefined)?.email_verified,
          ),
        });
        return true;
      } catch (error) {
        if (error instanceof AccountLinkRequiredError) {
          // Existing password account: make the user sign in with it first.
          return "/login?error=AccountNotLinked";
        }
        logger.error("Google sign-in failed", error);
        return "/login?error=OAuthSignin";
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          try {
            const record = await resolveGoogleUser({
              email: user.email ?? "",
              name: user.name ?? "Google user",
              image: user.image ?? undefined,
              providerVerified: true,
            });
            token.id = record.id;
            token.role = record.role;
            token.tokenVersion = record.tokenVersion;
            await recordLogin(record.id);
          } catch (error) {
            logger.error("Failed to resolve Google OAuth user", error);
          }
        } else {
          const credentialsUser = user as unknown as CredentialsUser;
          const id = credentialsUser.id || (token.sub as string | undefined);
          token.id = id;
          token.role = credentialsUser.role ?? "customer";
          token.tokenVersion = credentialsUser.tokenVersion ?? 0;
          if (id) await recordLogin(id);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? token.sub ?? "";
        session.user.role = (token.role as Role | undefined) ?? "customer";
        session.user.tokenVersion = (token.tokenVersion as number | undefined) ?? 0;
      }
      return session;
    },
  },
});
