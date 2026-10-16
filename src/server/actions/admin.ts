"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { isAppError } from "@/lib/errors";
import type { ZodType } from "zod";
import { requireRole } from "@/server/middleware/require-auth";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  createAdminCategory,
  createAdminBranch,
  createAdminProduct,
  createAdminZone,
  saveAdminPromotion,
  saveAdminStoreSettings,
  updateAdminBranch,
  updateAdminCategory,
  updateAdminCustomerStatus,
  updateAdminProduct,
  updateAdminStaff,
  updateAdminZone,
} from "@/server/services/admin.service";
import {
  adminBranchUpdateSchema,
  adminBranchCreateSchema,
  adminCategoryCreateSchema,
  adminCategoryUpdateSchema,
  adminCustomerStatusSchema,
  adminProductUpdateSchema,
  adminProductCreateSchema,
  adminPromotionSchema,
  adminStaffUpdateSchema,
  adminStoreSettingsSchema,
  adminZoneUpdateSchema,
  adminZoneCreateSchema,
} from "@/server/validation/admin";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

async function runAdminAction<T>(
  input: unknown,
  schema: ZodType<T>,
  operation: (data: T, actorId: string) => Promise<void>,
): Promise<AdminActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  try {
    const actor = await requireRole(["admin"]);
    await enforceRateLimit("staffOrderUpdate", actor.id);
    await operation(parsed.data, actor.id);
    for (const path of ["/admin", "/admin/catalog", "/admin/locations", "/admin/promotions", "/admin/staff"]) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error("Admin operation failed", error);
    return { ok: false, error: "The change could not be saved. Please try again." };
  }
}

export async function updateAdminProductAction(input: unknown) {
  return runAdminAction(input, adminProductUpdateSchema, (data, actorId) =>
    updateAdminProduct(actorId, data));
}

export async function createAdminProductAction(input: unknown) {
  return runAdminAction(input, adminProductCreateSchema, (data, actorId) =>
    createAdminProduct(actorId, data));
}

export async function createAdminCategoryAction(input: unknown) {
  return runAdminAction(input, adminCategoryCreateSchema, (data, actorId) =>
    createAdminCategory(actorId, data));
}

export async function updateAdminCategoryAction(input: unknown) {
  return runAdminAction(input, adminCategoryUpdateSchema, (data, actorId) =>
    updateAdminCategory(actorId, data.id, data.isActive));
}

export async function updateAdminBranchAction(input: unknown) {
  return runAdminAction(input, adminBranchUpdateSchema, (data, actorId) =>
    updateAdminBranch(actorId, data));
}

export async function createAdminBranchAction(input: unknown) {
  return runAdminAction(input, adminBranchCreateSchema, (data, actorId) =>
    createAdminBranch(actorId, data));
}

export async function updateAdminZoneAction(input: unknown) {
  return runAdminAction(input, adminZoneUpdateSchema, (data, actorId) =>
    updateAdminZone(actorId, data));
}

export async function createAdminZoneAction(input: unknown) {
  return runAdminAction(input, adminZoneCreateSchema, (data, actorId) =>
    createAdminZone(actorId, data));
}

export async function saveAdminPromotionAction(input: unknown) {
  return runAdminAction(input, adminPromotionSchema, (data, actorId) =>
    saveAdminPromotion(actorId, data));
}

export async function updateAdminStaffAction(input: unknown) {
  return runAdminAction(input, adminStaffUpdateSchema, (data, actorId) =>
    updateAdminStaff(actorId, data));
}

export async function updateAdminCustomerStatusAction(input: unknown) {
  return runAdminAction(input, adminCustomerStatusSchema, (data, actorId) =>
    updateAdminCustomerStatus(actorId, data.id, data.isActive));
}

export async function saveAdminStoreSettingsAction(input: unknown) {
  return runAdminAction(input, adminStoreSettingsSchema, (data, actorId) =>
    saveAdminStoreSettings(actorId, data));
}
