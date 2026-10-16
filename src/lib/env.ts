import "server-only";
import { z } from "zod";

/**
 * Server environment contract. Parsed once at module load; invalid or missing
 * required variables fail fast — but only when a caller asks for them via
 * getServerEnv(), so `next build`/`next dev` never crash on a bare checkout.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().min(1).default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  AUTH_SECRET: z.string().min(10, "AUTH_SECRET must be at least 10 characters"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  SOCKET_SERVER_INTERNAL_URL: z.string().url().optional(),
  SOCKET_INTERNAL_SECRET: z.string().min(32).optional(),
  SOCKET_TICKET_SECRET: z.string().min(32).optional(),
  AUTH_TRUST_HOST: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SEED_DEMO_DATA: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  // --- Delivery & geocoding -------------------------------------------------
  // Straight-line radius (km) around the delivery origin that we will deliver
  // to. Applied server-side; the client only ever displays it.
  DELIVERY_RADIUS_KM: z.coerce.number().positive().max(50).optional(),
  // Address geocoding. "demo" (or a missing key) uses the clearly-labelled
  // sample lookup in server/services/geo.service.ts — never real geocoding.
  GEOCODING_PROVIDER: z.enum(["demo", "mapbox", "google"]).default("demo"),
  GEOCODING_API_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const parsed = serverEnvSchema.safeParse(process.env);

/** Unguarded access — only for call sites that already validated via getServerEnv. */
export const env: ServerEnv = parsed.success ? parsed.data : ({} as ServerEnv);

/** Throws a descriptive error if the server environment is not configured. */
export function getServerEnv(): ServerEnv {
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")} — ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }
  return parsed.data;
}

export const isProduction = env.NODE_ENV === "production";

/**
 * True only when both Google OAuth credentials are configured. Used to decide
 * whether the "Continue with Google" button is shown — we never render a
 * sign-in option that would immediately fail.
 */
export function isGoogleAuthEnabled(): boolean {
  return Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
}