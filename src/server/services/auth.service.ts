import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { getAuthTokenModel, getUserModel } from "@/server/db/models";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { generateAuthToken, hashAuthToken } from "@/server/auth/tokens";
import { normalizeEmail } from "@/server/services/user.service";
import { AUTH } from "@/lib/constants";
import type { Role } from "@/lib/constants";
import type { AuthTokenType } from "@/server/db/models";
import { ValidationError } from "@/lib/errors";

/** Raised when a Google email collides with a password account (no auto-link). */
export class AccountLinkRequiredError extends Error {
  constructor() {
    super("account-link-required");
    this.name = "AccountLinkRequiredError";
  }
}

async function issueToken(
  userId: string,
  type: AuthTokenType,
  ttlSeconds: number,
): Promise<string> {
  await connectDb();
  const AuthToken = getAuthTokenModel();

  // Invalidate any outstanding tokens of the same type (single active token).
  await AuthToken.updateMany(
    { user: userId, type, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );

  const raw = generateAuthToken();
  await AuthToken.create({
    user: userId,
    type,
    tokenHash: hashAuthToken(raw),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    consumedAt: null,
  });
  return raw;
}

async function consumeToken(
  rawToken: string,
  type: AuthTokenType,
): Promise<string | null> {
  if (!rawToken) return null;
  await connectDb();
  const AuthToken = getAuthTokenModel();
  const doc = await AuthToken.findOneAndUpdate(
    {
      tokenHash: hashAuthToken(rawToken),
      type,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { new: true },
  ).lean<{ user: unknown } | null>();

  return doc ? String(doc.user) : null;
}

// --- Email verification ------------------------------------------------------

export async function issueEmailVerificationToken(userId: string): Promise<string> {
  return issueToken(userId, "email_verification", AUTH.verificationTokenTtlSeconds);
}

export async function verifyEmailToken(
  rawToken: string,
): Promise<{ email: string } | null> {
  const userId = await consumeToken(rawToken, "email_verification");
  if (!userId) return null;

  await connectDb();
  const User = getUserModel();
  const doc = await User.findByIdAndUpdate(
    userId,
    { $set: { emailVerified: new Date() } },
    { new: true },
  ).lean<{ email: string } | null>();
  return doc ? { email: doc.email } : null;
}

// --- Password reset ----------------------------------------------------------

export async function createPasswordResetToken(
  email: string,
): Promise<{ userId: string; email: string; token: string } | null> {
  await connectDb();
  const User = getUserModel();
  const user = await User.findOne({ normalizedEmail: normalizeEmail(email) })
    .select("+passwordHash")
    .lean<{ _id: { toString(): string }; email: string; isActive: boolean } | null>();

  // Missing or inactive accounts behave identically to callers, which must
  // return a generic response either way (no account enumeration).
  if (!user || !user.isActive) return null;

  const token = await issueToken(
    user._id.toString(),
    "password_reset",
    AUTH.resetTokenTtlSeconds,
  );
  return { userId: user._id.toString(), email: user.email, token };
}

export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string,
): Promise<boolean> {
  const userId = await consumeToken(rawToken, "password_reset");
  if (!userId) return false;

  await connectDb();
  const User = getUserModel();
  const passwordHash = await hashPassword(newPassword);
  const result = await User.updateOne(
    { _id: userId },
    {
      // Bump tokenVersion so every existing session for this account is revoked.
      $set: { passwordHash },
      $inc: { tokenVersion: 1 },
    },
  );
  if (result.matchedCount === 0) return false;

  // Any other outstanding resets for this user are now void.
  const AuthToken = getAuthTokenModel();
  await AuthToken.updateMany(
    { user: userId, type: "password_reset", consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );
  return true;
}

// --- Credentials / sessions --------------------------------------------------

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await connectDb();
  const User = getUserModel();
  const user = await User.findById(userId)
    .select("+passwordHash")
    .lean<{ passwordHash?: string; oauthProviders?: string[] } | null>();

  if (!user) throw new ValidationError([{ message: "Account not found." }], "Account not found");
  if (!user.passwordHash) {
    throw new ValidationError(
      [{ field: "currentPassword", message: "This account signs in with Google. Set a password from there." }],
      "No password set",
    );
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new ValidationError(
      [{ field: "currentPassword", message: "That current password is incorrect." }],
      "Incorrect password",
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await User.updateOne({ _id: userId }, { $set: { passwordHash } });
}

/** Re-hash on successful login if the stored hash used older/weaker params. */
export async function upgradePasswordHash(
  userId: string,
  password: string,
): Promise<void> {
  await connectDb();
  const User = getUserModel();
  const passwordHash = await hashPassword(password);
  await User.updateOne({ _id: userId }, { $set: { passwordHash } });
}

// --- Google / OAuth ----------------------------------------------------------

export async function resolveGoogleUser(input: {
  email: string;
  name: string;
  image?: string;
  providerVerified: boolean;
}): Promise<{ id: string; role: Role; tokenVersion: number }> {
  if (!input.providerVerified) throw new AccountLinkRequiredError();

  const email = normalizeEmail(input.email);
  await connectDb();
  const User = getUserModel();
  const existing = await User.findOne({ normalizedEmail: email })
    .select("+passwordHash")
    .lean<{
      _id: Types.ObjectId;
      role: Role;
      tokenVersion?: number;
      passwordHash?: string;
      oauthProviders?: string[];
      emailVerified?: Date | null;
    } | null>();

  if (!existing) {
    const created = await User.create({
      email,
      normalizedEmail: email,
      name: input.name.trim() || "Google user",
      image: input.image,
      role: "customer",
      emailVerified: new Date(),
      oauthProviders: ["google"],
    });
    return { id: created._id.toString(), role: created.role, tokenVersion: 0 };
  }

  const linked = existing.oauthProviders ?? [];
  // Never auto-link Google onto an account that also has a password: the user
  // must prove ownership by signing in with that password first.
  if (existing.passwordHash && !linked.includes("google")) {
    throw new AccountLinkRequiredError();
  }

  await User.updateOne(
    { _id: existing._id },
    {
      $set: {
        oauthProviders: linked.includes("google") ? linked : [...linked, "google"],
        ...(input.image ? { image: input.image } : {}),
        ...(existing.emailVerified ? {} : { emailVerified: new Date() }),
      },
    },
  );
  return {
    id: existing._id.toString(),
    role: existing.role,
    tokenVersion: existing.tokenVersion ?? 0,
  };
}

export type SessionUserState = {
  id: string;
  role: Role;
  name: string;
  email: string;
  tokenVersion: number;
  image?: string;
};

/**
 * Server-side session revalidation used by `requireAuth`. Returns null when the
 * account was deleted, deactivated, or the JWT version is stale (e.g. after a
 * password reset) — effectively revoking that session.
 */
export async function revalidateSessionUser(
  userId: string,
  tokenVersion: number,
): Promise<SessionUserState | null> {
  if (!userId) return null;
  await connectDb();
  const User = getUserModel();
  const doc = await User.findById(userId).lean<{
    _id: { toString(): string };
    role: Role;
    name: string;
    email: string;
    image?: string | null;
    isActive: boolean;
    tokenVersion?: number;
  } | null>();

  if (!doc || !doc.isActive) return null;
  if ((doc.tokenVersion ?? 0) !== tokenVersion) return null;

  return {
    id: doc._id.toString(),
    role: doc.role,
    name: doc.name,
    email: doc.email,
    tokenVersion: doc.tokenVersion ?? 0,
    image: doc.image ?? undefined,
  };
}

export async function recordLogin(userId: string): Promise<void> {
  await connectDb();
  const User = getUserModel();
  await User.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } });
}
