import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/lib/api-response";
import { reverseGeocode } from "@/server/services/geo.service";
import { validate } from "@/server/validation/common";
import { reverseGeocodeQuerySchema } from "@/server/validation/location";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const { lat, lng } = validate(
    reverseGeocodeQuerySchema,
    {
      lat: params.get("lat") ?? undefined,
      lng: params.get("lng") ?? undefined,
    },
    "location",
  );

  const response = await reverseGeocode({ lat, lng });
  return ok(response);
});
