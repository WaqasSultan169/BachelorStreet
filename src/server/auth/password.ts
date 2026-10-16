import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id parameters. Tuned to the OWASP baseline (≈19 MiB memory, t=2, p=1),
 * which is a good balance for a small Node server. Stored in the hash string,
 * so parameters can be raised later without breaking existing hashes; use
 * needsRehash() to upgrade on next successful login.
 *
 * `algorithm: 2` is Argon2id (Argon2d=0, Argon2i=1). We use the literal value
 * because @node-rs/argon2 exposes it as an ambient const enum, which cannot be
 * referenced under isolatedModules.
 */
const ARGON2_ALGORITHM = 2;
const ARGON2_OPTIONS = {
  algorithm: ARGON2_ALGORITHM,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Constant-ish work used when no account (or no password) exists, so a
 * missing user isn't distinguishable from a wrong password by response time.
 */
export async function verifyPasswordDummy(): Promise<void> {
  try {
    await verify(
      "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$" +
        "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MDEyMzQ1Njc4OTAx",
      "not-a-real-password",
    );
  } catch {
    // Ignore: this call only exists to spend comparable time.
  }
}

/** True when an existing hash was produced with different (weaker) params. */
export function needsRehash(passwordHash: string): boolean {
  try {
    const parsed = parseHashOptions(passwordHash);
    if (!parsed) return true;
    return (
      parsed.algorithm !== ARGON2_OPTIONS.algorithm ||
      parsed.memoryCost < ARGON2_OPTIONS.memoryCost ||
      parsed.timeCost < ARGON2_OPTIONS.timeCost
    );
  } catch {
    return true;
  }
}

function parseHashOptions(
  passwordHash: string,
): { algorithm: number; memoryCost: number; timeCost: number } | null {
  const match = /^\$argon2(id|i|d)\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(
    passwordHash,
  );
  if (!match) return null;
  const algorithm = match[1] === "id" ? 2 : match[1] === "i" ? 1 : 0;
  return {
    algorithm,
    memoryCost: Number(match[3]),
    timeCost: Number(match[4]),
  };
}
