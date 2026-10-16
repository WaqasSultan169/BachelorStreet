import "server-only";
import type { User } from "next-auth";
import type { Role } from "@/lib/constants";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { auth } from "@/auth";
import { revalidateSessionUser } from "@/server/services/auth.service";
import { ROLES } from "@/lib/constants";

type SessionUser = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  role: Role;
  tokenVersion: number;
};

/**
 * Require an authenticated, still-valid session. Revalidates against the
 * database so deactivated/deleted accounts and stale sessions (e.g. after a
 * password reset bumped tokenVersion) are rejected server-side.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new UnauthorizedError();

  const valid = await revalidateSessionUser(id, session.user.tokenVersion ?? 0);
  if (!valid) {
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }
  return valid;
}

/**
 * Require a session whose role is included in `roles`; throw 403 otherwise.
 * Admins bypass role lists (admins are allowed everywhere).
 */
export async function requireRole(
  roles: readonly Role[],
): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role === "admin") return user;
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export type AuthedUser = SessionUser;
export type { User };