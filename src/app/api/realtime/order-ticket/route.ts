import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/middleware/require-auth";
import { authorizeOrderSocketAccess } from "@/server/services/order.service";
import { createSocketTicket } from "@/server/services/realtime/socket-ticket";
import { validate } from "@/server/validation/common";
import { socketTicketRequestSchema } from "@/server/validation/realtime";

export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (request: NextRequest) => {
  const actor = await requireAuth();
  await enforceRateLimit("orderSocketTicket", actor.id);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  const { trackingId } = validate(
    socketTicketRequestSchema,
    body,
    "socketTicket",
  );
  if (!trackingId && actor.role !== "admin" && actor.role !== "delivery_boy") {
    throw new BadRequestError("An order tracking ID is required.");
  }
  const access = trackingId
    ? await authorizeOrderSocketAccess(trackingId, actor)
    : undefined;
  const ticket = createSocketTicket({
    sub: actor.id,
    role: actor.role,
    tokenVersion: actor.tokenVersion,
  });
  return ok({
    ticket,
    ...(access ? { orderId: access.orderId, version: access.version } : {}),
  });
});
