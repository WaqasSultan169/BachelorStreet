import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { getOrderTrackingByTrackingId } from "@/server/services/order.service";
import { validate } from "@/server/validation/common";
import { trackingIdParamsSchema } from "@/server/validation/realtime";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(
  async (_request: NextRequest, context) => {
    const { trackingId } = validate(
      trackingIdParamsSchema,
      await context.params,
      "trackingId",
    );
    const order = await getOrderTrackingByTrackingId(trackingId);
    if (!order) throw new NotFoundError("Order not found");
    return ok(order);
  },
);
