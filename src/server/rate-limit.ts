import "server-only";
import { headers } from "next/headers";
import { RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Demo-grade in-process sliding-window rate limiter.
 *
 * It is process-local (resets on restart, not shared across instances), which
 * is fine for this single-node demo. For production, swap the Map for a shared
 * store (e.g. Redis) keyed the same way — see SECURITY.md §4.
 */
type Rule = { limit: number; windowMs: number };

const buckets = new Map<string, number[]>();
const MAX_KEYS = 20_000;

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 10 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  verifyEmail: { limit: 10, windowMs: 60 * 60 * 1000 },
  requestPasswordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
  resetPassword: { limit: 10, windowMs: 15 * 60 * 1000 },
  changePassword: { limit: 10, windowMs: 15 * 60 * 1000 },
  placeOrder: { limit: 20, windowMs: 60 * 60 * 1000 },
  orderSocketTicket: { limit: 30, windowMs: 60 * 1000 },
  staffOrderUpdate: { limit: 60, windowMs: 60 * 1000 },
} satisfies Record<string, Rule>;

/** Best-effort client IP from proxy headers. Falls back to a shared bucket. */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip")?.trim() || "unknown";
}

/** Count one attempt against a key; throw RateLimitError when the rule is hit. */
export function checkRateLimit(key: string, rule: Rule): void {
  const now = Date.now();
  const windowStart = now - rule.windowMs;
  const existing = buckets.get(key) ?? [];
  const recent = existing.filter((t) => t > windowStart);

  if (recent.length >= rule.limit) {
    const retryMs = recent[0]! + rule.windowMs - now;
    buckets.set(key, recent);
    throw new RateLimitError(
      `Too many attempts. Please try again in ${Math.ceil(retryMs / 1000)}s.`,
    );
  }

  recent.push(now);
  buckets.set(key, recent);

  if (buckets.size > MAX_KEYS) {
    for (const [bucketKey, times] of buckets) {
      if (times.every((t) => t <= windowStart)) buckets.delete(bucketKey);
    }
  }
}

/**
 * Enforce a rule for the current client, scoped by a scope name (and an
 * optional extra discriminator such as a normalized email).
 */
export async function enforceRateLimit(
  scope: keyof typeof RATE_LIMITS,
  discriminator = "",
): Promise<void> {
  try {
    const ip = await getClientIp();
    checkRateLimit(`${scope}:${ip}:${discriminator}`, RATE_LIMITS[scope]);
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    // Never let rate limiting break the request path (e.g. headers unavailable).
    logger.warn("Rate limiter unavailable", error);
  }
}
