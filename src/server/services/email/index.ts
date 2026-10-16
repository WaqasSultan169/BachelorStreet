import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

let transportPromise: Promise<Transporter | null> | null = null;

/**
 * Lazily build a Nodemailer transporter from SMTP env vars. Returns null when
 * SMTP is not configured (default local dev), in which case sendMail no-ops
 * with an explicit log line — it never throws just because email is off.
 */
export async function getTransport(): Promise<Transporter | null> {
  if (transportPromise) return transportPromise;

  transportPromise = (async () => {
    const env = getServerEnv();
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      logger.info("Email transport disabled: SMTP_* not configured");
      return null;
    }
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  })();

  return transportPromise;
}

export type MailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/** Send a transactional mail. Returns true when sent, false when disabled. */
export async function sendMail(args: MailArgs): Promise<boolean> {
  const env = getServerEnv();
  const transport = await getTransport();

  if (!transport) {
    logger.info("Email disabled — dropping message to", args.to, {
      subject: args.subject,
    });
    return false;
  }

  try {
    await transport.sendMail({
      from: env.EMAIL_FROM ?? "Bachelor's Street <no-reply@example.com>",
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    logger.info("Email sent to", args.to, { subject: args.subject });
    return true;
  } catch (error) {
    logger.error("Email send failed", error);
    return false;
  }
}