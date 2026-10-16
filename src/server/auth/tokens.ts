import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * One-time auth tokens (email verification / password reset).
 *
 * The raw token is 256 bits of CSPRNG output and is only ever sent to the user.
 * Only its SHA-256 hash is stored, so a database leak does not expose usable
 * tokens. Tokens are additionally single-use and time-boxed (see the AuthToken
 * model and auth.service.ts).
 */
export function generateAuthToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAuthToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
