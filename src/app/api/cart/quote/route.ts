import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { quoteCart } from "@/server/services/cart.service";
import type { CartQuoteInput } from "@/server/validation/cart";

export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  return ok(await quoteCart(body as CartQuoteInput));
});
