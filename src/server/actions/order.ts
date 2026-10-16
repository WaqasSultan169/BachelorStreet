"use server";

import { auth } from "@/auth";
import {
  placeOrderSchema,
  type PlaceOrderInput,
} from "@/server/validation/order";
import { createOrder } from "@/server/services/order.service";
import { enforceRateLimit } from "@/server/rate-limit";
import { isAppError, RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z, type ZodType } from "zod";
import { requireRole } from "@/server/middleware/require-auth";
import {
  assignDeliveryWorker,
  recordCashCollected,
  transitionOrderStatus,
  updateDeliveryLocation,
  type OrderActor,
  type OrderDto,
} from "@/server/services/order.service";
import {
  assignDeliveryWorkerSchema,
  staffOrderStatusSchema,
  updateDeliveryLocationSchema,
} from "@/server/validation/realtime";

export type PlaceOrderResult =
  | { ok: true; trackingId: string; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type StaffOrderActionResult =
  | { ok: true; order: OrderDto }
  | { ok: false; error: string };

async function runStaffOrderAction<T>(
  input: unknown,
  schema: ZodType<T>,
  operation: (
    data: T,
    actor: OrderActor,
  ) => Promise<OrderDto>,
  roles: readonly ("admin" | "delivery_boy")[],
): Promise<StaffOrderActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  try {
    const actor = await requireRole(roles);
    await enforceRateLimit("staffOrderUpdate", actor.id);
    const order = await operation(parsed.data, {
      id: actor.id,
      role: actor.role,
    });
    return { ok: true, order };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error("staff order action failed", error);
    return { ok: false, error: "We couldn't update this order. Please try again." };
  }
}

export async function changeOrderStatusAction(
  input: unknown,
): Promise<StaffOrderActionResult> {
  return runStaffOrderAction(
    input,
    staffOrderStatusSchema,
    async (payload, actor) => {
      return transitionOrderStatus(
        payload.orderId,
        payload.status,
        actor,
        payload.note,
      );
    },
    ["admin", "delivery_boy"],
  );
}

export async function assignDeliveryWorkerAction(
  input: unknown,
): Promise<StaffOrderActionResult> {
  return runStaffOrderAction(
    input,
    assignDeliveryWorkerSchema,
    async (payload, actor) => {
      return assignDeliveryWorker(payload.orderId, payload.deliveryBoyId, actor);
    },
    ["admin"],
  );
}

export async function updateDeliveryLocationAction(
  input: unknown,
): Promise<StaffOrderActionResult> {
  return runStaffOrderAction(
    input,
    updateDeliveryLocationSchema,
    async (payload, actor) => {
      return updateDeliveryLocation(
        payload.orderId,
        payload.coordinates,
        actor,
      );
    },
    ["admin", "delivery_boy"],
  );
}

export async function recordCashCollectedAction(
  input: unknown,
): Promise<StaffOrderActionResult> {
  return runStaffOrderAction(
    input,
    z.object({ orderId: z.string().regex(/^[a-f\d]{24}$/i) }),
    (payload, actor) => recordCashCollected(payload.orderId, actor),
    ["admin", "delivery_boy"],
  );
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

/**
 * Place an order. Reachable by anyone (guest checkout) as well as signed-in
 * customers. All prices, availability, coverage and totals are recomputed on
 * the server — the client payload only expresses intent.
 */
export async function placeOrderAction(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check your details and try again.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const session = await auth();
  const userId = session?.user?.id;

  try {
    await enforceRateLimit("placeOrder", parsed.data.contact.email);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  try {
    const order = await createOrder(parsed.data, userId);
    return { ok: true, trackingId: order.trackingId, orderNumber: order.orderNumber };
  } catch (error) {
    if (isAppError(error)) {
      const fieldErrors =
        error.code === "VALIDATION_ERROR" && error.details
          ? Object.fromEntries(
              error.details
                .filter((detail) => Boolean(detail.field))
                .map((detail) => [detail.field as string, detail.message]),
            )
          : undefined;
      return { ok: false, error: error.message, fieldErrors };
    }
    logger.error("placeOrderAction failed", error);
    return {
      ok: false,
      error: "We couldn't place your order right now. Please try again.",
    };
  }
}
