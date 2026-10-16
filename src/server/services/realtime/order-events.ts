import "server-only";
import {
  socketOrderEventSchema,
  type SocketOrderEvent,
} from "@/lib/socket/events";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/** Best-effort event publication after the authoritative MongoDB write. */
export async function publishOrderEvent(event: SocketOrderEvent): Promise<void> {
  const parsed = socketOrderEventSchema.safeParse(event);
  if (!parsed.success) {
    logger.error("Refusing to publish invalid order event", parsed.error.issues);
    return;
  }

  const endpoint = env.SOCKET_SERVER_INTERNAL_URL;
  const secret = env.SOCKET_INTERNAL_SECRET;
  if (!endpoint || !secret) {
    if (env.NODE_ENV === "production") {
      logger.warn("Order event not published: realtime service is not configured");
    }
    return;
  }

  try {
    const response = await fetch(new URL("/internal/publish", endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) {
      logger.warn("Realtime service rejected an order event", {
        status: response.status,
        type: event.type,
      });
    }
  } catch (error) {
    logger.warn("Realtime service unavailable; clients will recover by refetching", error);
  }
}
