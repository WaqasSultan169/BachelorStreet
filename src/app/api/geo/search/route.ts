import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/lib/api-response";
import { searchAddresses } from "@/server/services/geo.service";
import { validate } from "@/server/validation/common";
import { geocodeQuerySchema } from "@/server/validation/location";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const lat = Number.parseFloat(params.get("lat") ?? "");
  const lng = Number.parseFloat(params.get("lng") ?? "");

  const { q, proximity } = validate(
    geocodeQuerySchema,
    {
      q: params.get("q") ?? "",
      ...(Number.isFinite(lat) && Number.isFinite(lng)
        ? { proximity: { lat, lng } }
        : {}),
    },
    "search",
  );

  const response = await searchAddresses(q, proximity);
  return ok(response);
});
