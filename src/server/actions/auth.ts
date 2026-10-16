"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type LoginInput,
  type RegisterInput,
  type VerifyEmailInput,
  type ResendVerificationInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type ChangePasswordInput,
} from "@/server/validation";
import { createCredentialUser, findUserByEmail, findUserById } from "@/server/services/user.service";
import {
  changeOwnPassword,
  createPasswordResetToken,
  issueEmailVerificationToken,
  resetPasswordWithToken,
  verifyEmailToken,
} from "@/server/services/auth.service";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/server/services/email/auth-emails";
import { enforceRateLimit } from "@/server/rate-limit";
import { isAppError, RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AuthActionResult } from "@/server/actions/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";

function zodFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

// --- Sign in / out -----------------------------------------------------------

export async function loginAction(input: LoginInput): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please check your details and try again." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      switch (error.code) {
        case "email_not_verified":
          return {
            error:
              "Your email isn't verified yet. Check your inbox, or resend the link from the verify page.",
          };
        case "account_inactive":
          return { error: "This account has been disabled. Contact support for help." };
        case "rate_limited":
          return { error: "Too many attempts. Please wait a few minutes and try again." };
        default:
          return { error: "Invalid email or password." };
      }
    }
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }
      return { error: "Could not sign you in. Please try again." };
    }
    logger.error("loginAction failed", error);
    return { error: GENERIC_ERROR };
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

// --- Registration & email verification ---------------------------------------

export async function registerAction(
  input: RegisterInput,
): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    await enforceRateLimit("register", parsed.data.email);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    throw error;
  }

  try {
    const user = await createCredentialUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      phone: parsed.data.phone || undefined,
    });

    const token = await issueEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, user.name, token);

    return {
      ok: true,
      message:
        "Account created. We've emailed you a link to verify your address before you can sign in.",
    };
  } catch (error) {
    if (isAppError(error) && error.code === "CONFLICT") {
      const message = "That email is already registered.";
      return { error: message, fieldErrors: { email: message } };
    }
    logger.error("registerAction failed", error);
    return { error: GENERIC_ERROR };
  }
}

export async function verifyEmailAction(
  input: VerifyEmailInput,
): Promise<AuthActionResult> {
  const parsed = verifyEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "This verification link is not valid." };
  }

  try {
    await enforceRateLimit("verifyEmail");
    const result = await verifyEmailToken(parsed.data.token);
    if (!result) {
      return {
        error:
          "This verification link is invalid or has expired. Request a new one below.",
      };
    }
    return { ok: true, message: "Email verified — you can sign in now." };
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    logger.error("verifyEmailAction failed", error);
    return { error: GENERIC_ERROR };
  }
}

export async function resendVerificationAction(
  input: ResendVerificationInput,
): Promise<AuthActionResult> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  try {
    await enforceRateLimit("verifyEmail", parsed.data.email);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    throw error;
  }

  const genericMessage =
    "If that email belongs to an unverified account, a new link is on its way.";

  try {
    const user = await findUserByEmail(parsed.data.email);
    if (user && !user.emailVerified && user.hasPassword) {
      const token = await issueEmailVerificationToken(user.id);
      await sendVerificationEmail(user.email, user.name, token);
    }
    return { ok: true, message: genericMessage };
  } catch (error) {
    logger.error("resendVerificationAction failed", error);
    return { ok: true, message: genericMessage };
  }
}

// --- Password reset ----------------------------------------------------------

export async function forgotPasswordAction(
  input: ForgotPasswordInput,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  try {
    await enforceRateLimit("requestPasswordReset", parsed.data.email);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    throw error;
  }

  const genericMessage =
    "If an account exists for that email, we've sent a link to reset your password.";

  try {
    const result = await createPasswordResetToken(parsed.data.email);
    if (result) {
      const user = await findUserById(result.userId);
      await sendPasswordResetEmail(result.email, user?.name ?? "there", result.token);
    }
    return { ok: true, message: genericMessage };
  } catch (error) {
    logger.error("forgotPasswordAction failed", error);
    return { ok: true, message: genericMessage };
  }
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    await enforceRateLimit("resetPassword");
    const ok = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    if (!ok) {
      return { error: "This reset link is invalid or has expired. Request a new one." };
    }
    return {
      ok: true,
      message: "Password updated. Sign in with your new password.",
    };
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    logger.error("resetPasswordAction failed", error);
    return { error: GENERIC_ERROR };
  }
}

export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<AuthActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to change your password." };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    await enforceRateLimit("changePassword", session.user.id);
    await changeOwnPassword(
      session.user.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    return { ok: true, message: "Password updated." };
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    if (isAppError(error) && error.code === "VALIDATION_ERROR") {
      const field = error.details?.[0]?.field;
      const message = error.details?.[0]?.message ?? "Could not update password.";
      return { error: message, fieldErrors: field ? { [field]: message } : undefined };
    }
    logger.error("changePasswordAction failed", error);
    return { error: GENERIC_ERROR };
  }
}
