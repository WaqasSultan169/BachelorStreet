import "server-only";
import { sendMail } from "@/server/services/email";
import { getServerEnv } from "@/lib/env";
import { APP, AUTH } from "@/lib/constants";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#faf7f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1a17">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <h1 style="font-size:20px;margin:0 0 8px">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <p style="margin:28px 0 0;font-size:12px;color:#7a736a">${escapeHtml(
      APP.name,
    )} · ${escapeHtml(APP.city)}, ${escapeHtml(APP.country)}</p>
  </div></body></html>`;
}

function actionButton(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="background:#c1442e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;display:inline-block">${escapeHtml(
    label,
  )}</a></p>`;
}

export async function sendVerificationEmail(to: string, name: string, rawToken: string): Promise<void> {
  const url = `${getServerEnv().APP_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const hours = Math.round(AUTH.verificationTokenTtlSeconds / 3600);
  const html = layout(
    "Confirm your email",
    `<p style="font-size:14px;line-height:1.6">Hi ${escapeHtml(
      name,
    )}, confirm this email address to finish setting up your account.</p>
     ${actionButton(url, "Verify email")}
     <p style="font-size:12px;color:#7a736a;line-height:1.6">This link expires in ${hours} hours and can only be used once. If you didn't create an account, you can ignore this email.</p>`,
  );
  await sendMail({
    to,
    subject: `Confirm your ${APP.shortName} account`,
    html,
    text: `Verify your email (expires in ${hours}h): ${url}`,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, rawToken: string): Promise<void> {
  const url = `${getServerEnv().APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const minutes = Math.round(AUTH.resetTokenTtlSeconds / 60);
  const html = layout(
    "Reset your password",
    `<p style="font-size:14px;line-height:1.6">Hi ${escapeHtml(
      name,
    )}, we received a request to reset your password. This link expires in ${minutes} minutes and can only be used once.</p>
     ${actionButton(url, "Reset password")}
     <p style="font-size:12px;color:#7a736a;line-height:1.6">If you didn't request this, no action is needed — your password stays unchanged.</p>`,
  );
  await sendMail({
    to,
    subject: `Reset your ${APP.shortName} password`,
    html,
    text: `Reset your password (expires in ${minutes} min): ${url}`,
  });
}
