"use server";

import { revalidatePath } from "next/cache";
import { isAppError } from "@/lib/errors";
import { requireRole } from "@/server/middleware/require-auth";
import { enforceRateLimit } from "@/server/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { adminHeroSlideSchema } from "@/server/validation/admin";
import {
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
} from "@/server/services/heroSlide.service";

export type HeroSlideActionResult = { ok: true } | { ok: false; error: string };

export async function createHeroSlideAction(input: unknown): Promise<HeroSlideActionResult> {
  const parsed = adminHeroSlideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  try {
    const actor = await requireRole(["admin"]);
    await enforceRateLimit("staffOrderUpdate", actor.id);
    await createHeroSlide(actor.id, parsed.data);
    revalidatePath("/admin/hero");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error("Hero slide create failed", error);
    return { ok: false, error: "The slide could not be saved. Please try again." };
  }
}

export async function updateHeroSlideAction(input: unknown): Promise<HeroSlideActionResult> {
  const parsed = adminHeroSlideSchema.extend({ id: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  try {
    const actor = await requireRole(["admin"]);
    await enforceRateLimit("staffOrderUpdate", actor.id);
    await updateHeroSlide(actor.id, { ...parsed.data, id: parsed.data.id });
    revalidatePath("/admin/hero");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error("Hero slide update failed", error);
    return { ok: false, error: "The slide could not be updated. Please try again." };
  }
}

export async function deleteHeroSlideAction(id: string): Promise<HeroSlideActionResult> {
  try {
    const actor = await requireRole(["admin"]);
    await enforceRateLimit("staffOrderUpdate", actor.id);
    await deleteHeroSlide(actor.id, id);
    revalidatePath("/admin/hero");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error("Hero slide delete failed", error);
    return { ok: false, error: "The slide could not be deleted. Please try again." };
  }
}
