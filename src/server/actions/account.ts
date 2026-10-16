"use server";

import { auth } from "@/auth";
import { updateProfileSchema, addressSchema } from "@/server/validation";
import type { UpdateProfileInput } from "@/server/validation";
import {
  addUserAddress,
  removeUserAddress,
  updateUserAddress,
  updateUserProfile,
} from "@/server/services/user.service";
import type { UserAddress } from "@/server/db/models";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AuthActionResult } from "@/server/actions/types";
import { requireAuth } from "@/server/middleware/require-auth";
import { updateUserNotificationPreferences } from "@/server/services/user.service";
import { z } from "zod";

const GENERIC_ERROR = "Something went wrong. Please try again.";

function toAddress(input: {
  label: string;
  street?: string | null;
  area?: string | null;
  city?: string | null;
  phone?: string | null;
  instructions?: string | null;
  isDefault?: boolean;
}): UserAddress {
  return {
    label: input.label,
    street: input.street || undefined,
    area: input.area || undefined,
    city: input.city || undefined,
    phone: input.phone || undefined,
    instructions: input.instructions || undefined,
    isDefault: input.isDefault ?? false,
  };
}

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

function handleError(action: string, error: unknown): AuthActionResult {
  if (isAppError(error) && error.code === "VALIDATION_ERROR") {
    const field = error.details?.[0]?.field;
    const message = error.details?.[0]?.message ?? "Invalid input.";
    return { error: message, fieldErrors: field ? { [field]: message } : undefined };
  }
  logger.error(`${action} failed`, error);
  return { error: GENERIC_ERROR };
}

export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<AuthActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    await updateUserProfile(session.user.id, {
      name: parsed.data.name,
      phone: parsed.data.phone || undefined,
    });
    return { ok: true, message: "Profile updated." };
  } catch (error) {
    return handleError("updateProfileAction", error);
  }
}

export async function addAddressAction(
  input: Record<string, unknown>,
): Promise<AuthActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    await addUserAddress(session.user.id, toAddress(parsed.data));
    return { ok: true, message: "Address saved." };
  } catch (error) {
    return handleError("addAddressAction", error);
  }
}

export async function updateAddressAction(
  addressId: string,
  input: Record<string, unknown>,
): Promise<AuthActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    await updateUserAddress(session.user.id, addressId, toAddress(parsed.data));
    return { ok: true, message: "Address updated." };
  } catch (error) {
    return handleError("updateAddressAction", error);
  }
}

export async function removeAddressAction(
  addressId: string,
): Promise<AuthActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };
  try {
    await removeUserAddress(session.user.id, addressId);
    return { ok: true, message: "Address removed." };
  } catch (error) {
    return handleError("removeAddressAction", error);
  }
}

export async function updateNotificationPreferencesAction(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = z.object({ email: z.boolean(), phone: z.boolean() }).safeParse(input);
  if (!parsed.success) return { error: "Invalid notification preference." };
  try {
    const actor = await requireAuth();
    await updateUserNotificationPreferences(actor.id, parsed.data);
    return { ok: true, message: "Notification preferences saved." };
  } catch (error) {
    return handleError("updateNotificationPreferencesAction", error);
  }
}
